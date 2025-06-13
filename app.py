# -*- mode: python ; coding: utf-8 -*-
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from bson.objectid import ObjectId
from datetime import datetime, timedelta, UTC
import os
import sys
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from werkzeug.utils import secure_filename
import openpyxl
from io import BytesIO
import schedule
import time
import threading
import waitress
import tenacity
import json
import secrets
import hashlib
from dotenv import load_dotenv
import bcrypt
import tempfile
import traceback
import uuid
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)
logging.getLogger('pymongo').setLevel(logging.WARNING)
logging.getLogger('waitress').setLevel(logging.WARNING)

# Determine base directory
if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
    if not os.access(base_dir, os.W_OK):
        logger.warning(f"No write permission in {base_dir}. Using temporary directory.")
        base_dir = tempfile.gettempdir()
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

# Use UPLOAD_FOLDER from environment variable if set (for production), else default to local path
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(base_dir, 'static', 'uploads'))

# Ensure necessary directories exist with permission handling
def create_directory(directory):
    try:
        if not os.path.exists(directory):
            os.makedirs(directory)
            logger.info(f"Created directory: {directory}")
    except PermissionError as e:
        logger.error(f"Permission denied creating directory {directory}: {str(e)}")
        fallback_dir = os.path.join(tempfile.gettempdir(), os.path.basename(directory))
        if not os.path.exists(fallback_dir):
            os.makedirs(fallback_dir)
            logger.info(f"Created fallback directory: {fallback_dir}")
        return fallback_dir
    except Exception as e:
        logger.error(f"Error creating directory {directory}: {str(e)}")
        raise
    return directory

# Initialize Flask app
app = Flask(__name__, static_folder=None, static_url_path=None)
STATIC_DIR = os.path.join(base_dir, 'dist')

# Create directories and set configurations
app.config['UPLOAD_FOLDER'] = create_directory(UPLOAD_FOLDER)
STATIC_DIR = create_directory(STATIC_DIR)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_JSON_EXTENSIONS = {'json'}
MAX_BACKUPS = 5

# CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"]
    }
})

# MongoDB connection with retry logic
@tenacity.retry(
    wait=tenacity.wait_fixed(2),
    stop=tenacity.stop_after_attempt(5),
    reraise=True
)
def connect_to_mongodb():
    try:
        client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
        client.server_info()
        logger.info("Successfully connected to MongoDB")
        return client
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise

try:
    client = connect_to_mongodb()
    db = client['restaurant']
    items_collection = db['items']
    customers_collection = db['customers']
    sales_collection = db['sales']
    tables_collection = db['tables']
    users_collection = db['users']
    picked_up_collection = db['picked_up_items']
    opening_collection = db['pos_opening_entries']
    pos_closing_collection = db['pos_closing_entries']
    email_tokens_collection = db['email_tokens']
    settings_collection = db['system_settings']
    kitchens_collection = db['kitchens']
    item_groups_collection = db['item_groups']  
    kitchen_saved_collection = db['kitchen_saved']
    variants_collection = db['variants']
    employees_collection = db['employees']
    activeorders_collection = db['activeorders']
    tripreports_collection = db['tripreports']  # New collection for trip reports
    
except Exception as e:
    logger.critical(f"Could not establish MongoDB connection: {str(e)}")
    sys.exit(1)

# Twilio setup
account_sid = ''
auth_token = ''
twilio_phone = ''
# twilio_messaging_sid = 'MGf5700bd791ccba00ef2084cc78d41573'  # Uncomment if needed




# Check if all Twilio credentials are present
if not all([account_sid, auth_token, twilio_phone]):
    print("Error: Missing Twilio credentials")
    raise ValueError("Twilio credentials are not set")

# Initialize Twilio client
try:
    twilio_client = Client(account_sid, auth_token)
    print("Twilio client initialized successfully")
except Exception as e:
    print(f"Failed to initialize Twilio client: {str(e)}")
    raise

# Email configuration
EMAIL_USER = os.getenv('EMAIL_USER', 'manojmanoj@gmail.com')
EMAIL_PASS = os.getenv('EMAIL_PASS', 'mwlo fcyw ouub oxnd')
FROM_EMAIL = os.getenv('FROM_EMAIL', 'manojmanoj@gmail.com')

# Test users
TEST_USERS = [
    {
        "email": "admin@gmail.com",
        "password": "123",
        "phone_number": "1234567890",
        "role": "admin",
        "firstName": "admin",
        "company": "POS 8",
        "pos_profile": "POS-001",
        "status": "Active",
        "created_at": datetime.now(UTC).isoformat(),
        "is_test": True
    },
    {
        "email": "bearer@gmail.com",
        "password": "123",
        "phone_number": "0987654321",
        "role": "bearer",
        "firstName": "bearer",
        "company": "POS 8",
        "pos_profile": "POS-001",
        "status": "Active",
        "created_at": datetime.now(UTC).isoformat(),
        "is_test": True
    }
]

# Utility functions
def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def convert_objectid_to_str(item):
    if isinstance(item, dict) and '_id' in item:
        item['_id'] = str(item['_id'])
    for field in ['addons', 'combos', 'variants']:
        if field in item and isinstance(item[field], list):
            for sub_item in item[field]:
                if '_id' in sub_item:
                    sub_item['_id'] = str(sub_item['_id'])
    return item

def handle_image_upload(file):
    if not file or not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        logger.error(f"Invalid file or type: {file.filename if file else 'No file'}")
        return None
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        file.save(file_path)
        logger.info(f"New image uploaded: {filename}")
    else:
        logger.info(f"Using existing image: {filename}")
    return filename

def manage_backup_limit():
    backup_dir = app.config['UPLOAD_FOLDER']
    backups = [f for f in os.listdir(backup_dir) if f.startswith('backup_restaurant_data_') and f.endswith('.xlsx')]
    backups.sort(key=lambda x: os.path.getmtime(os.path.join(backup_dir, x)))
    while len(backups) >= MAX_BACKUPS:
        oldest_backup = backups.pop(0)
        os.remove(os.path.join(backup_dir, oldest_backup))
        logger.info(f"Removed oldest backup: {oldest_backup}")

def sanitize_image_fields(data):
    """Sanitize image fields to ensure only filenames are stored."""
    if 'image' in data and data['image']:
        data['image'] = data['image'].split('/')[-1] if '/' in data['image'] else data['image']
    if 'images' in data:
        data['images'] = [img.split('/')[-1] if '/' in img else img for img in data['images']]
    for addon in data.get('addons', []):
        if 'addon_image' in addon and addon['addon_image']:
            addon['addon_image'] = addon['addon_image'].split('/')[-1] if '/' in addon['addon_image'] else addon['addon_image']
        if 'spicy' in addon and addon['spicy']:
            if 'spicy_image' in addon['spicy'] and addon['spicy']['spicy_image']:
                addon['spicy']['spicy_image'] = addon['spicy']['spicy_image'].split('/')[-1] if '/' in addon['spicy']['spicy_image'] else addon['spicy']['spicy_image']
            if 'non_spicy_image' in addon['spicy'] and addon['spicy']['non_spicy_image']:
                addon['spicy']['non_spicy_image'] = addon['spicy']['non_spicy_image'].split('/')[-1] if '/' in addon['spicy']['non_spicy_image'] else addon['spicy']['non_spicy_image']
    for combo in data.get('combos', []):
        if 'combo_image' in combo and combo['combo_image']:
            combo['combo_image'] = combo['combo_image'].split('/')[-1] if '/' in combo['combo_image'] else combo['combo_image']
        if 'spicy' in combo and combo['spicy']:
            if 'spicy_image' in combo['spicy'] and combo['spicy']['spicy_image']:
                combo['spicy']['spicy_image'] = combo['spicy']['spicy_image'].split('/')[-1] if '/' in combo['spicy']['spicy_image'] else combo['spicy']['spicy_image']
            if 'non_spicy_image' in combo['spicy'] and combo['spicy']['non_spicy_image']:
                combo['spicy']['non_spicy_image'] = combo['spicy']['non_spicy_image'].split('/')[-1] if '/' in combo['spicy']['non_spicy_image'] else combo['spicy']['non_spicy_image']
    for variant in data.get('custom_variants', []):
        for subheading in variant.get('subheadings', []):
            if 'image' in subheading and subheading['image']:
                subheading['image'] = subheading['image'].split('/')[-1] if '/' in subheading['image'] else subheading['image']
    if 'spicy' in data and data['spicy']:
        if 'spicy_image' in data['spicy'] and data['spicy']['spicy_image']:
            data['spicy']['spicy_image'] = data['spicy']['spicy_image'].split('/')[-1] if '/' in data['spicy']['spicy_image'] else data['spicy']['spicy_image']
        if 'non_spicy_image' in data['spicy'] and data['spicy']['non_spicy_image']:
            data['spicy']['non_spicy_image'] = data['spicy']['non_spicy_image'].split('/')[-1] if '/' in data['spicy']['non_spicy_image'] else data['spicy']['non_spicy_image']
    return data

def create_backup():
    try:
        wb = openpyxl.Workbook()
        wb.remove(wb.active)
        collections = {
            'customers': customers_collection,
            'items': items_collection,
            'sales': sales_collection,
            'tables': tables_collection,
            'users': users_collection,
            'picked_up_items': picked_up_collection,
            'pos_opening_entries': opening_collection,
            'pos_closing_entries': pos_closing_collection,
            'system_settings': settings_collection,
            'kitchens': kitchens_collection,
            'item_groups': item_groups_collection
            
        }
        for collection_name, collection in collections.items():
            ws = wb.create_sheet(title=collection_name)
            data = list(collection.find())
            if not data:
                ws.append(['No data'])
                continue
            sample_doc = data[0]
            headers = list(sample_doc.keys())
            ws.append(headers)
            for doc in data:
                row = [str(doc.get(header, '')) if isinstance(doc.get(header), (ObjectId, list, dict)) else doc.get(header, '') for header in headers]
                ws.append(row)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f'backup_restaurant_data_{timestamp}.xlsx'
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(file_path, 'wb') as f:
            f.write(buffer.getvalue())
        manage_backup_limit()
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = EMAIL_USER
        msg['Subject'] = f'Restaurant Data Backup - {timestamp}'
        body = f'Backup of restaurant data generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}.'
        msg.attach(MIMEText(body, 'plain'))
        with open(file_path, 'rb') as f:
            attachment = MIMEBase('application', 'octet-stream')
            attachment.set_payload(f.read())
            encoders.encode_base64(attachment)
            attachment.add_header('Content-Disposition', f'attachment; filename={filename}')
            msg.attach(attachment)
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        logger.info(f"Backup created and emailed: {filename}")
        return True, f"Backup created successfully: {filename}"
    except Exception as e:
        logger.error(f"Error in backup: {str(e)}")
        return False, str(e)

def manage_offers():
    """Check all items and update offer status based on current time."""
    try:
        current_time = datetime.now(UTC)
        items = items_collection.find({
            '$or': [
                {'offer_start_time': {'$exists': True}},
                {'offer_end_time': {'$exists': True}}
            ]
        })
        for item in items:
            item_id = item['_id']
            offer_start_time = item.get('offer_start_time')
            offer_end_time = item.get('offer_end_time')
            should_unset = False
            if offer_start_time and offer_end_time:
                try:
                    start_time = datetime.fromisoformat(str(offer_start_time).replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(str(offer_end_time).replace('Z', '+00:00'))
                    if current_time > end_time:
                        should_unset = True
                        logger.info(f"Offer expired for item {item.get('item_name')} (ID: {item_id})")
                    elif start_time > end_time:
                        should_unset = True
                        logger.warning(f"Invalid offer times for item {item_id}: start_time after end_time")
                    else:
                        logger.debug(f"Offer for item {item.get('item_name')} (ID: {item_id}) is active or pending")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid offer time format for item {item_id}: {str(e)}")
                    should_unset = True
            elif offer_end_time:
                try:
                    end_time = datetime.fromisoformat(str(offer_end_time).replace('Z', '+00:00'))
                    if current_time > end_time:
                        should_unset = True
                        logger.info(f"Offer expired for item {item.get('item_name')} (ID: {item_id})")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid offer_end_time for item {item_id}: {str(e)}")
                    should_unset = True
            if should_unset:
                items_collection.update_one(
                    {'_id': item_id},
                    {'$unset': {'offer_price': "", 'offer_start_time': "", 'offer_end_time': ""}}
                )
                logger.info(f"Unset offer fields for item {item.get('item_name')} (ID: {item_id})")
    except Exception as e:
        logger.error(f"Error in manage_offers: {str(e)}")

def schedule_tasks():
    """Schedule backups and offer management."""
    schedule.every(6).hours.do(create_backup)
    schedule.every(1).minutes.do(manage_offers)
    while True:
        schedule.run_pending()
        time.sleep(60)

def start_scheduler():
    scheduler_thread = threading.Thread(target=schedule_tasks, daemon=True)
    scheduler_thread.start()
    logger.info("Automatic backup and offer scheduler started")

# System settings management
def get_system_settings():
    settings = settings_collection.find_one({"_id": "system_settings"})
    if not settings:
        default_settings = {
            "_id": "system_settings",
            "disableUserPassLogin": False,
            "allowLoginUsingMobileNumber": False,
            "allowLoginUsingUserName": True,
            "loginWithEmailLink": False,
            "sessionExpiry": "06:00",
            "documentShareKeyExpiry": 30,
            "denyMultipleSessions": False,
            "allowConsecutiveLoginAttempts": 5,
            "allowLoginAfterFail": 60,
            "enableTwoFactorAuth": False,
            "logoutOnPasswordReset": False,
            "forceUserToResetPassword": 0,
            "resetPasswordLinkExpiryDuration": "24:00",
            "passwordResetLimit": 3,
            "enablePasswordPolicy": False,
            "minimumPasswordScore": 2
        }
        settings_collection.insert_one(default_settings)
        return default_settings
    return settings

def save_system_settings(settings):
    settings["_id"] = "system_settings"
    settings_collection.replace_one({"_id": "system_settings"}, settings, upsert=True)

# API Routes
@app.route('/api/test', methods=['GET'])
def test_route():
    logger.info("Test route accessed")
    return jsonify({"message": "API is working"}), 200

@app.route('/api/import-mongodb', methods=['POST', 'OPTIONS'])
def import_mongodb():
    logger.info(f"Request received: {request.method} {request.path}")
    
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({"success": True})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
        return response, 200

    try:
        # Check if a file is included in the request
        if 'file' not in request.files:
            logger.error("No file part in request")
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            logger.error("No selected file")
            return jsonify({"error": "No selected file"}), 400
        
        # Validate file extension
        if not allowed_file(file.filename, ALLOWED_JSON_EXTENSIONS):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({"error": "Only JSON files are allowed"}), 400

        filename = secure_filename(file.filename)
        
        # Extract collection name from filename (handle multiple dots)
        # Example: restaurant.item_groups.json -> item_groups
        collection_name = filename.rsplit('.', 1)[0].split('.')[-1]
        
        # Define valid collections
        valid_collections = [
            'users', 'tables', 'items', 'customers', 'sales',
            'picked_up_items', 'pos_opening_entries', 'pos_closing_entries',
            'kitchens', 'item_groups'  # Added item_groups
        ]
        
        # Validate collection name
        if not collection_name or collection_name not in valid_collections:
            logger.error(f"Invalid or unsupported collection name: {collection_name}")
            return jsonify({"error": f"Unsupported collection name: {collection_name}"}), 400

        target_collection = db[collection_name]
        
        # Read and parse JSON file
        data = json.loads(file.read().decode('utf-8'))
        if not isinstance(data, list):
            logger.error("JSON data must be an array")
            return jsonify({"error": "JSON data must be an array"}), 400

        inserted_count = 0
        for record in data:
            # Handle MongoDB ObjectId
            if '_id' in record and isinstance(record['_id'], dict) and '$oid' in record['_id']:
                record['_id'] = ObjectId(record['_id']['$oid'])
            
            # Add import timestamp
            record['imported_at'] = datetime.now(UTC).isoformat()

            # Define unique key for upsert based on collection
            unique_key = (
                {'_id': record.get('_id')} if '_id' in record else
                {'email': record.get('email')} if collection_name == 'users' else
                {'table_number': record.get('table_number')} if collection_name == 'tables' else
                {'item_name': record.get('item_name')} if collection_name == 'items' else
                {'phone_number': record.get('phone_number')} if collection_name == 'customers' else
                {'invoice_no': record.get('invoice_no')} if collection_name == 'sales' else
                {'customerName': record.get('customerName')} if collection_name == 'picked_up_items' else
                {'name': record.get('name')} if collection_name in ['pos_opening_entries', 'pos_closing_entries'] else
                {'kitchen_name': record.get('kitchen_name')} if collection_name == 'kitchens' else
                {'group_name': record.get('group_name')} if collection_name == 'item_groups' else
                {}
            )

            if not unique_key:
                logger.error(f"No unique key defined for record in collection {collection_name}")
                return jsonify({"error": f"No unique key defined for record in collection {collection_name}"}), 400

            # Perform upsert
            target_collection.replace_one(unique_key, record, upsert=True)
            inserted_count += 1

        logger.info(f"Imported {inserted_count} records into {collection_name}")
        return jsonify({"message": f"Successfully imported {inserted_count} records into {collection_name}"}), 200

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON format in file {filename}: {str(e)}")
        return jsonify({"error": f"Invalid JSON format: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Error importing data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/static/uploads/<filename>', methods=['GET'])
def serve_uploaded_image(filename):
    logger.debug(f"Serving image: {filename}")
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        logger.error(f"Error serving image {filename}: {str(e)}")
        return jsonify({"error": "Image not found"}), 404

@app.route('/api/upload-image', methods=['POST', 'OPTIONS'])
def upload_image():
    if request.method == 'OPTIONS':
        response = jsonify({"success": True})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 200
    try:
        if 'files' not in request.files:
            logger.error("No files part in request")
            return jsonify({"error": "No files provided"}), 400
        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            logger.error("No valid files selected")
            return jsonify({"error": "No valid files selected"}), 400
        urls = []
        for file in files:
            if file and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
                filename = handle_image_upload(file)
                if filename:
                    urls.append(filename)
                    logger.info(f"Uploaded image: {filename}")
                else:
                    logger.warning(f"Failed to upload image: {file.filename}")
            else:
                logger.warning(f"Invalid file type: {file.filename}")
        if not urls:
            return jsonify({"error": "No valid images uploaded"}), 400
        return jsonify({"urls": urls}), 200
    except Exception as e:
        logger.error(f"Error uploading images: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/delete-image/<filename>', methods=['DELETE', 'OPTIONS'])
def delete_image(filename):
    if request.method == 'OPTIONS':
        response = jsonify({"success": True})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 200
    try:
        item_id = request.args.get('item_id')
        field = request.args.get('field', 'image')
        valid_fields = {'image', 'images', 'addon_image', 'combo_image', 'variant_image'}
        if field not in valid_fields:
            logger.error(f"Invalid field specified: {field}")
            return jsonify({"error": f"Invalid field: {field}. Must be one of {valid_fields}"}), 400
        if not item_id:
            logger.error("Item ID is required for image deletion")
            return jsonify({"error": "Item ID is required"}), 400
        try:
            object_id = ObjectId(item_id)
        except Exception:
            logger.error(f"Invalid item ID: {item_id}")
            return jsonify({"error": "Invalid item ID"}), 400
        filename = secure_filename(filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if field == 'images':
            result = items_collection.update_one(
                {"_id": object_id, "images": filename},
                {"$pull": {"images": filename}}
            )
            if result.modified_count == 0:
                logger.warning(f"Image {filename} not found in images array for item {item_id}")
                return jsonify({"error": "Image not found in item"}), 404
        elif field == 'image':
            result = items_collection.update_one(
                {"_id": object_id, "image": filename},
                {"$set": {"image": None}}
            )
            if result.modified_count == 0:
                logger.warning(f"Image {filename} not found in image field for item {item_id}")
                return jsonify({"error": "Image not found in item"}), 404
        elif field == 'addon_image':
            result = items_collection.update_one(
                {"_id": object_id, "addons.addon_image": filename},
                {"$set": {"addons.$[elem].addon_image": None}},
                array_filters=[{"elem.addon_image": filename}]
            )
            if result.modified_count == 0:
                logger.warning(f"Image {filename} not found in addons for item {item_id}")
                return jsonify({"error": "Image not found in addons"}), 404
        elif field == 'combo_image':
            result = items_collection.update_one(
                {"_id": object_id, "combos.combo_image": filename},
                {"$set": {"combos.$[elem].combo_image": None}},
                array_filters=[{"elem.combo_image": filename}]
            )
            if result.modified_count == 0:
                logger.warning(f"Image {filename} not found in combos for item {item_id}")
                return jsonify({"error": "Image not found in combos"}), 404
        elif field == 'variant_image':
            result = items_collection.update_one(
                {"_id": object_id, "variants.variant_image": filename},
                {"$set": {"variants.$[elem].variant_image": None}},
                array_filters=[{"elem.variant_image": filename}]
            )
            if result.modified_count == 0:
                logger.warning(f"Image {filename} not found in variants for item {item_id}")
                return jsonify({"error": "Image not found in variants"}), 404
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Image deleted from filesystem: {filename}")
            except PermissionError as e:
                logger.error(f"Permission denied deleting image {filename}: {str(e)}")
                return jsonify({"error": "Permission denied deleting image"}), 403
            except Exception as e:
                logger.error(f"Error deleting image {filename}: {str(e)}")
                return jsonify({"error": "Error deleting image"}), 500
        else:
            logger.warning(f"Image file not found on filesystem: {filename}")
        logger.info(f"Image {filename} deleted from {field} for item {item_id}")
        return jsonify({"message": "Image deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting image {filename} for item {item_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        settings = get_system_settings()
        identifier = data.get('identifier')
        password = data.get('password')
        login_type = data.get('type', '')
        if not identifier or not password:
            return jsonify({"message": "Identifier and password are required"}), 400
        user = None
        mobileOnly = settings.get('allowLoginUsingMobileNumber', False) and not settings.get('allowLoginUsingUserName', False) and not settings.get('loginWithEmailLink', False)
        mobileOrUsername = settings.get('allowLoginUsingMobileNumber', False) and settings.get('allowLoginUsingUserName', False) and not settings.get('loginWithEmailLink', False)
        allThree = settings.get('allowLoginUsingMobileNumber', False) and settings.get('allowLoginUsingUserName', False) and settings.get('loginWithEmailLink', False)
        if mobileOnly:
            user = users_collection.find_one({"phone_number": identifier})
        elif mobileOrUsername or login_type == 'mobile_or_username':
            user = users_collection.find_one({"phone_number": identifier}) or users_collection.find_one({"firstName": identifier})
        elif allThree or login_type == 'all':
            user = users_collection.find_one({"phone_number": identifier}) or users_collection.find_one({"firstName": identifier}) or users_collection.find_one({"email": identifier})
        else:
            return jsonify({"message": "No valid login method enabled"}), 403
        requires_opening_entry = False
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            last_opening_time = user.get('last_opening_entry_time')
            if last_opening_time:
                try:
                    last_opening = datetime.fromisoformat(last_opening_time.replace('Z', '+00:00'))
                    time_diff = datetime.now(UTC) - last_opening
                    if time_diff.total_seconds() / 3600 >= 8:
                        requires_opening_entry = True
                except ValueError:
                    logger.warning(f"Invalid last_opening_entry_time format for user {identifier}")
                    requires_opening_entry = True
            else:
                requires_opening_entry = True
            response = {
                "message": "Login successful",
                "user": {
                    "id": str(user['_id']),
                    "username": user['firstName'],
                    "role": user['role'],
                    "email": user.get('email', ''),
                    "phone_number": user.get('phone_number', ''),
                    "pos_profile": user.get('pos_profile', 'POS-001'),
                    "company": user.get('company', 'POS 8'),
                    "is_test": False
                },
                "requires_opening_entry": requires_opening_entry
            }
            logger.info(f"User logged in: {identifier}, role: {user['role']}, requires_opening_entry: {requires_opening_entry}")
            return jsonify(response), 200
        test_user = next((u for u in TEST_USERS if ((u['firstName'] == identifier or u['phone_number'] == identifier or u['email'] == identifier) and u['password'] == password)), None)
        if test_user:
            response = {
                "message": "Login successful",
                "user": {
                    "id": str(ObjectId()),
                    "username": test_user['firstName'],
                    "role": test_user['role'],
                    "email": test_user.get('email', ''),
                    "phone_number": test_user.get('phone_number', ''),
                    "pos_profile": test_user.get('pos_profile', 'POS-001'),
                    "company": test_user.get('company', 'POS 8'),
                    "is_test": True
                },
                "requires_opening_entry": False
            }
            logger.info(f"Login with test credentials: {identifier}, role: {test_user['role']}")
            return jsonify(response), 200
        logger.warning(f"Invalid login attempt: {identifier}")
        return jsonify({"message": "Invalid credentials"}), 401
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return jsonify({"message": f"Login failed: {str(e)}"}), 500

@app.route('/api/request-email-login', methods=['POST'])
def request_email_login():
    try:
        settings = get_system_settings()
        if not settings.get('loginWithEmailLink', False):
            return jsonify({"message": "Email login is not enabled"}), 403
        data = request.get_json()
        email = data.get('email')
        if not email:
            return jsonify({"message": "Email is required"}), 400
        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"message": "User not found"}), 404
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expiry = datetime.now(UTC) + timedelta(hours=24)
        email_tokens_collection.insert_one({
            "email": email,
            "token_hash": token_hash,
            "expiry": expiry.isoformat(),
            "used": False,
            "created_at": datetime.now(UTC).isoformat()
        })
        login_link = f"http://localhost:5000/api/verify-email-login?token={token}"
        html_content = f"""
        <h1>Login to Your Account</h1>
        <p>Click the link below to log in:</p>
        <a href="{login_link}">Login Now</a>
        <p>This link expires in 24 hours.</p>
        """
        msg = MIMEMultipart('alternative')
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        msg['Subject'] = "Your Login Link"
        msg.attach(MIMEText(html_content, 'html'))
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        logger.info(f"Email login link sent to: {email}")
        return jsonify({"message": "Login link sent to your email"}), 200
    except Exception as e:
        logger.error(f"Error sending email login link: {str(e)}")
        return jsonify({"message": f"Failed: {str(e)}"}), 500

@app.route('/api/verify-email-login', methods=['GET'])
def verify_email_login():
    try:
        settings = get_system_settings()
        if not settings.get('loginWithEmailLink', False):
            return jsonify({"message": "Email login is not enabled"}), 403
        token = request.args.get('token')
        if not token:
            return jsonify({"message": "Token is required"}), 400
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        token_doc = email_tokens_collection.find_one({"token_hash": token_hash})
        if not token_doc or token_doc['used'] or datetime.fromisoformat(token_doc['expiry']) < datetime.now(UTC):
            return jsonify({"message": "Invalid or expired token"}), 401
        user = users_collection.find_one({"email": token_doc['email']})
        if not user:
            return jsonify({"message": "User not found"}), 404
        email_tokens_collection.update_one({"_id": token_doc['_id']}, {"$set": {"used": True}})
        response = {
            "message": "Login successful",
            "user": {
                "id": str(user['_id']),
                "username": user['firstName'],
                "role": user['role'],
                "email": user.get('email', ''),
                "phone_number": user.get('phone_number', ''),
                "pos_profile": user.get('pos_profile', 'POS-001'),
                "company": user.get('company', 'POS 8'),
                "is_test": False
            }
        }
        logger.info(f"Email login successful for: {user['email']}")
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Error verifying email login: {str(e)}")
        return jsonify({"message": f"Failed: {str(e)}"}), 500

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        firstName = data.get('firstName')
        phone_number = data.get('phoneNumber')
        company = data.get('company', 'POS 8')
        if not email or not password or not role or not firstName or not phone_number:
            logger.error("Missing required fields in registration")
            return jsonify({"message": "Email, password, role, firstName, and phoneNumber are required"}), 400
        if email in [u['email'] for u in TEST_USERS]:
            logger.warning(f"Registration attempt with test email: {email}")
            return jsonify({"message": "Cannot register with test credentials"}), 400
        if users_collection.find_one({"email": email}):
            logger.warning(f"Registration attempt with existing email: {email}")
            return jsonify({"message": "Email already registered"}), 400
        if users_collection.find_one({"phone_number": phone_number}):
            logger.warning(f"Registration attempt with existing phone number: {phone_number}")
            return jsonify({"message": "Phone number already registered"}), 400
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_user = {
            "email": email,
            "password": hashed_password,
            "role": role,
            "firstName": firstName,
            "phone_number": phone_number,
            "company": company,
            "pos_profile": "POS-001",
            "status": "Active",
            "created_at": datetime.now(UTC).isoformat()
        }
        result = users_collection.insert_one(new_user)
        logger.info(f"User registered: {email}, role: {role}")
        return jsonify({
            "message": "Registration successful",
            "user": {
                "id": str(result.inserted_id),
                "email": email,
                "role": role,
                "firstName": firstName,
                "phone_number": phone_number,
                "company": company
            }
        }), 201
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        return jsonify({"message": f"Registration failed: {str(e)}"}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        users = list(users_collection.find({}, {"password": 0}))
        users_list = [convert_objectid_to_str(user) for user in users]
        logger.info(f"Fetched {len(users_list)} users from MongoDB")
        return jsonify(users_list), 200
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<email>', methods=['DELETE'])
def delete_user(email):
    try:
        if email in [u['email'] for u in TEST_USERS]:
            logger.warning(f"Attempt to delete test user: {email}")
            return jsonify({"message": "Cannot delete test users"}), 400
        result = users_collection.delete_one({"email": email})
        if result.deleted_count == 0:
            logger.warning(f"User not found for deletion: {email}")
            return jsonify({"message": "User not found"}), 404
        logger.info(f"User deleted: {email}")
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting user {email}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['GET'])
def get_settings():
    try:
        settings = get_system_settings()
        logger.info("Fetched system settings")
        return jsonify(settings), 200
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    try:
        data = request.get_json()
        save_system_settings(data)
        logger.info("System settings updated")
        return jsonify({"message": "Settings updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        items = list(items_collection.find())
        items_list = []
        current_time = datetime.now(UTC)
        for item in items:
            item = convert_objectid_to_str(item)
            is_offer_active = False
            if 'offer_start_time' in item and item['offer_start_time'] and 'offer_end_time' in item and item['offer_end_time']:
                try:
                    offer_start_time = datetime.fromisoformat(str(item['offer_start_time']).replace('Z', '+00:00'))
                    offer_end_time = datetime.fromisoformat(str(item['offer_end_time']).replace('Z', '+00:00'))
                    if offer_start_time <= current_time <= offer_end_time:
                        is_offer_active = True
                        logger.debug(f"Offer active for item {item['_id']}: {offer_start_time} to {offer_end_time}")
                    else:
                        logger.debug(f"Offer inactive for item {item['_id']}: {offer_start_time} to {offer_end_time}")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid offer time format for item {item['_id']}: {str(e)}")
                    items_collection.update_one(
                        {'_id': ObjectId(item['_id'])},
                        {'$unset': {'offer_price': "", 'offer_start_time': "", 'offer_end_time': ""}}
                    )
                    item.pop('offer_price', None)
                    item.pop('offer_start_time', None)
                    item.pop('offer_end_time', None)
            elif 'offer_end_time' in item and item['offer_end_time']:
                try:
                    offer_end_time = datetime.fromisoformat(str(item['offer_end_time']).replace('Z', '+00:00'))
                    if current_time <= offer_end_time:
                        is_offer_active = True
                        logger.debug(f"Offer active for item {item['_id']}: ends at {offer_end_time}")
                    else:
                        logger.debug(f"Offer expired for item {item['_id']}: ended at {offer_end_time}")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid offer_end_time format for item {item['_id']}: {str(e)}")
                    items_collection.update_one(
                        {'_id': ObjectId(item['_id'])},
                        {'$unset': {'offer_price': "", 'offer_start_time': "", 'offer_end_time': ""}}
                    )
                    item.pop('offer_price', None)
                    item.pop('offer_start_time', None)
                    item.pop('offer_end_time', None)
            if not is_offer_active:
                item.pop('offer_price', None)
                item.pop('offer_start_time', None)
                item.pop('offer_end_time', None)
            if 'image' in item and item['image']:
                item['image'] = f"/static/uploads/{item['image']}"
            for addon in item.get("addons", []):
                if 'addon_image' in addon and addon['addon_image']:
                    addon['addon_image'] = f"/static/uploads/{addon['addon_image']}"
            for combo in item.get("combos", []):
                if 'combo_image' in combo and combo['combo_image']:
                    combo['combo_image'] = f"/static/uploads/{combo['combo_image']}"
            for variant in item.get("variants", []):
                if 'variant_image' in variant and variant['variant_image']:
                    variant['variant_image'] = f"/static/uploads/{variant['variant_image']}"
            items_list.append(item)
        logger.info(f"Fetched {len(items_list)} items")
        return jsonify(items_list), 200
    except Exception as e:
        logger.error(f"Error fetching items: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/items/<identifier>', methods=['GET'])
def get_item(identifier):
    try:
        item = None
        try:
            object_id = ObjectId(identifier)
            item = items_collection.find_one({'_id': object_id})
        except Exception:
            item = items_collection.find_one({'item_name': identifier})
        if not item:
            logger.warning(f"Item not found: {identifier}")
            return jsonify({"error": "Item not found"}), 404
        item = convert_objectid_to_str(item)
        current_time = datetime.now(UTC)
        is_offer_active = False
        if 'offer_start_time' in item and item['offer_start_time'] and 'offer_end_time' in item and item['offer_end_time']:
            try:
                offer_start_time = datetime.fromisoformat(str(item['offer_start_time']).replace('Z', '+00:00'))
                offer_end_time = datetime.fromisoformat(str(item['offer_end_time']).replace('Z', '+00:00'))
                if offer_start_time <= current_time <= offer_end_time:
                    is_offer_active = True
                    logger.debug(f"Offer active for item {item['_id']}: {offer_start_time} to {offer_end_time}")
                else:
                    logger.debug(f"Offer inactive for item {item['_id']}: {offer_start_time} to {offer_end_time}")
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid offer time format for item {item['_id']}: {str(e)}")
                items_collection.update_one(
                    {'_id': ObjectId(item['_id'])},
                    {'$unset': {'offer_price': "", 'offer_start_time': "", 'offer_end_time': ""}}
                )
                item.pop('offer_price', None)
                item.pop('offer_start_time', None)
                item.pop('offer_end_time', None)
        elif 'offer_end_time' in item and item['offer_end_time']:
            try:
                offer_end_time = datetime.fromisoformat(str(item['offer_end_time']).replace('Z', '+00:00'))
                if current_time <= offer_end_time:
                    is_offer_active = True
                    logger.debug(f"Offer active for item {item['_id']}: ends at {offer_end_time}")
                else:
                    logger.debug(f"Offer expired for item {item['_id']}: ended at {offer_end_time}")
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid offer_end_time for item {item['_id']}: {str(e)}")
                items_collection.update_one(
                    {'_id': ObjectId(item['_id'])},
                    {'$unset': {'offer_price': "", 'offer_start_time': "", 'offer_end_time': ""}}
                )
                item.pop('offer_price', None)
                item.pop('offer_start_time', None)
                item.pop('offer_end_time', None)
        if not is_offer_active:
            item.pop('offer_price', None)
            item.pop('offer_start_time', None)
            item.pop('offer_end_time', None)
        if 'image' in item and item['image']:
            item['image'] = f"/static/uploads/{item['image']}"
        for addon in item.get('addons', []):
            if 'addon_image' in addon and addon['addon_image']:
                addon['addon_image'] = f"/static/uploads/{addon['addon_image']}"
        for combo in item.get('combos', []):
            if 'combo_image' in combo and combo['combo_image']:
                combo['combo_image'] = f"/static/uploads/{combo['combo_image']}"
        logger.info(f"Fetched item: {identifier}")
        return jsonify(item), 200
    except Exception as e:
        logger.error(f"Error fetching item {identifier}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/items', methods=['POST'])
def create_item():
    try:
        data = request.json
        if not data:
            logger.error("No data provided for item creation")
            return jsonify({"error": "No data provided"}), 400
        required_fields = ['item_name', 'item_code', 'item_group', 'price_list_rate']
        for field in required_fields:
            if field not in data or not data[field]:
                logger.error(f"Missing or empty required field: {field}")
                return jsonify({"error": f"Missing or empty required field: {field}"}), 400
        if 'offer_start_time' in data and data['offer_start_time'] and 'offer_end_time' in data and data['offer_end_time']:
            try:
                offer_start_time = datetime.fromisoformat(str(data['offer_start_time']).replace('Z', '+00:00'))
                offer_end_time = datetime.fromisoformat(str(data['offer_end_time']).replace('Z', '+00:00'))
                if offer_start_time >= offer_end_time:
                    logger.error("offer_start_time must be before offer_end_time")
                    return jsonify({"error": "Offer start time must be before offer end time"}), 400
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid offer time format: {str(e)}")
                return jsonify({"error": f"Invalid offer time format: {str(e)}"}), 400
        data = sanitize_image_fields(data)
        data.setdefault('custom_addon_applicable', False)
        data.setdefault('custom_combo_applicable', False)
        data.setdefault('custom_total_calories', 0)
        data.setdefault('custom_total_protein', 0)
        data.setdefault('kitchen', "")
        data.setdefault('has_variant_pricing', False)
        data.setdefault('variant_prices', {"small_price": 0, "medium_price": 0, "large_price": 0})
        data.setdefault('variant_quantities', {"small_quantity": 0, "medium_quantity": 0, "large_quantity": 0})
        data.setdefault('sold_quantities', {"small_sold": 0, "medium_sold": 0, "large_sold": 0})
        data.setdefault('ice_preference', "without_ice")
        data.setdefault('ice_price', 0)
        data.setdefault('addons', [])
        data.setdefault('combos', [])
        data.setdefault('ingredients', [])
        data.setdefault('variants', [])
        data.setdefault('custom_variants', [])  # Added for custom variants
        data['created_at'] = datetime.now(UTC).isoformat()
        item_id = items_collection.insert_one(data).inserted_id
        logger.info(f"Item created with ID: {item_id}")
        return jsonify({'message': 'Item created successfully!', 'id': str(item_id)}), 201
    except Exception as e:
        logger.error(f"Error creating item: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/items/<item_id>', methods=['PUT'])
def update_item(item_id):
    try:
        item_data = request.get_json()
        if not item_data:
            logger.error("No data provided for item update")
            return jsonify({"error": "No data provided"}), 400
        try:
            object_id = ObjectId(item_id)
        except Exception:
            logger.error(f"Invalid item ID: {item_id}")
            return jsonify({"error": "Invalid item ID"}), 400
        if '_id' in item_data:
            del item_data['_id']
        if 'offer_start_time' in item_data and item_data['offer_start_time'] and 'offer_end_time' in item_data and item_data['offer_end_time']:
            try:
                offer_start_time = datetime.fromisoformat(str(item_data['offer_start_time']).replace('Z', '+00:00'))
                offer_end_time = datetime.fromisoformat(str(item_data['offer_end_time']).replace('Z', '+00:00'))
                if offer_start_time >= offer_end_time:
                    logger.error("offer_start_time must be before offer_end_time")
                    return jsonify({"error": "Offer start time must be before offer end time"}), 400
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid offer time format: {str(e)}")
                return jsonify({"error": f"Invalid offer time format: {str(e)}"}), 400
        item_data = sanitize_image_fields(item_data)
        item_data['modified_at'] = datetime.now(UTC).isoformat()
        result = items_collection.update_one({'_id': object_id}, {'$set': item_data})
        if result.matched_count == 0:
            logger.warning(f"Item not found for update: {item_id}")
            return jsonify({"error": "Item not found"}), 404
        logger.info(f"Item updated: {item_id}")
        return jsonify({"message": "Item updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating item {item_id}: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/items/<item_id>', methods=['PATCH'])
def patch_item(item_id):
    try:
        item_data = request.get_json()
        if not item_data:
            logger.error("No data provided for item patch")
            return jsonify({"error": "No data provided"}), 400
        try:
            object_id = ObjectId(item_id)
        except Exception:
            logger.error(f"Invalid item ID: {item_id}")
            return jsonify({"error": "Invalid item ID"}), 400
        if '_id' in item_data:
            del item_data['_id']
        item_data = sanitize_image_fields(item_data)
        item_data['modified_at'] = datetime.now(UTC).isoformat()
        result = items_collection.update_one({'_id': object_id}, {'$set': item_data})
        if result.matched_count == 0:
            logger.warning(f"Item not found for patch: {item_id}")
            return jsonify({"error": "Item not found"}), 404
        logger.info(f"Item patched: {item_id}")
        return jsonify({"message": "Item updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error patching item {item_id}: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/items/<item_id>', methods=['DELETE'])
def delete_item(item_id):
    try:
        try:
            object_id = ObjectId(item_id)
        except Exception:
            logger.error(f"Invalid item ID: {item_id}")
            return jsonify({"error": "Invalid item ID"}), 400
        result = items_collection.delete_one({'_id': object_id})
        if result.deleted_count == 0:
            logger.warning(f"Item not found for deletion: {item_id}")
            return jsonify({"error": "Item not found"}), 404
        logger.info(f"Item deleted: {item_id}")
        return jsonify({"message": "Item deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting item {item_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/items/<item_id>/offer', methods=['PUT'])
def update_item_offer(item_id):
    try:
        offer_data = request.get_json()
        try:
            object_id = ObjectId(item_id)
        except Exception:
            logger.error(f"Invalid item ID: {item_id}")
            return jsonify({"error": "Invalid item ID"}), 400
        if 'offer_price' not in offer_data or 'offer_start_time' not in offer_data or 'offer_end_time' not in offer_data:
            return jsonify({"error": "Offer price, start time, and end time are required"}), 400
        try:
            offer_start_time = datetime.fromisoformat(str(offer_data['offer_start_time']).replace('Z', '+00:00'))
            offer_end_time = datetime.fromisoformat(str(offer_data['offer_end_time']).replace('Z', '+00:00'))
            if offer_start_time >= offer_end_time:
                logger.error("offer_start_time must be before offer_end_time")
                return jsonify({"error": "Offer start time must be before offer end time"}), 400
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid offer time format: {str(e)}")
            return jsonify({"error": f"Invalid offer time format: {str(e)}"}), 400
        offer_data['modified_at'] = datetime.now(UTC).isoformat()
        result = items_collection.update_one({'_id': object_id}, {'$set': offer_data})
        if result.matched_count == 0:
            logger.warning(f"Item not found for offer update: {item_id}")
            return jsonify({"error": "Item not found"}), 404
        logger.info(f"Offer updated for item: {item_id}, start: {offer_start_time}, end: {offer_end_time}")
        return jsonify({"message": "Offer updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating offer for item {item_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/customers', methods=['GET'])
def get_all_customers():
    try:
        customers = list(customers_collection.find())
        customers = [convert_objectid_to_str(customer) for customer in customers]
        logger.info(f"Fetched {len(customers)} customers")
        return jsonify(customers), 200
    except Exception as e:
        logger.error(f"Error fetching customers: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/customers/<customer_id>', methods=['GET', 'PUT', 'DELETE'])
def customer_operations(customer_id):
    try:
        if not customer_id or customer_id == "undefined":
            logger.error("Invalid customer_id: 'undefined' or empty")
            return jsonify({"error": "Invalid customer ID"}), 400
        try:
            object_id = ObjectId(customer_id)
        except Exception as e:
            logger.error(f"Invalid ObjectId: {customer_id} - {str(e)}")
            return jsonify({"error": "Invalid customer ID format"}), 400
        if request.method == 'GET':
            customer = customers_collection.find_one({'_id': object_id})
            if not customer:
                logger.warning(f"Customer not found: {customer_id}")
                return jsonify({"error": "Customer not found"}), 404
            customer = convert_objectid_to_str(customer)
            logger.info(f"Fetched customer: {customer_id}")
            return jsonify(customer), 200
        elif request.method == 'PUT':
            customer_data = request.get_json()
            if not customer_data:
                logger.error("No data provided for customer update")
                return jsonify({"error": "No data provided"}), 400
            result = customers_collection.update_one(
                {'_id': object_id},
                {'$set': {
                    'customer_name': customer_data.get('customer_name', ''),
                    'phone_number': customer_data.get('phone_number', ''),
                    'whatsapp_number': customer_data.get('whatsapp_number', ''),
                    'email': customer_data.get('email', ''),
                    'building_name': customer_data.get('building_name', ''),
                    'flat_villa_no': customer_data.get('flat_villa_no', ''),
                    'location': customer_data.get('location', ''),
                    'modified_at': datetime.now(UTC).isoformat()
                }}
            )
            if result.matched_count == 0:
                logger.warning(f"Customer not found for update: {customer_id}")
                return jsonify({"error": "Customer not found"}), 404
            logger.info(f"Customer updated: {customer_id}")
            return jsonify({"message": "Customer updated successfully"}), 200
        elif request.method == 'DELETE':
            result = customers_collection.delete_one({'_id': object_id})
            if result.deleted_count == 0:
                logger.warning(f"Customer not found for deletion: {customer_id}")
                return jsonify({"error": "Customer not found"}), 404
            logger.info(f"Customer deleted: {customer_id}")
            return jsonify({"message": "Customer deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error in customer operations for {customer_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/customers', methods=['POST'])
def create_customer():
    try:
        customer_data = request.get_json()
        if not customer_data or 'customer_name' not in customer_data or 'phone_number' not in customer_data:
            logger.error("Invalid customer data provided")
            return jsonify({"error": "Customer name and phone number are required"}), 400
        existing_customer = customers_collection.find_one({'phone_number': customer_data['phone_number']})
        if existing_customer:
            logger.warning(f"Duplicate phone number: {customer_data['phone_number']}")
            return jsonify({"error": "Phone number already exists", "customer_name": existing_customer['customer_name']}), 409
        customer_data['created_at'] = datetime.now(UTC).isoformat()
        customer_data['modified_at'] = customer_data['created_at']
        result = customers_collection.insert_one(customer_data)
        new_customer_id = str(result.inserted_id)
        logger.info(f"Customer created: {new_customer_id}")
        return jsonify({"id": new_customer_id, "message": "Customer created successfully"}), 201
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales', methods=['POST'])
def create_sales_invoice():
    try:
        sales_data = request.json
        required_fields = ['customer', 'items', 'total']
        if not all(field in sales_data for field in required_fields):
            logger.error("Missing required fields in sales invoice")
            return jsonify({"error": "Missing required fields: customer, items, total"}), 400
        sales_data['date'] = datetime.now().strftime("%Y-%m-%d")
        sales_data['time'] = datetime.now().strftime("%H:%M:%S")
        net_total = float(sales_data['total'])
        vat_amount = net_total * 0.10
        grand_total = net_total + vat_amount
        sales_data['vat_amount'] = round(vat_amount, 2)
        sales_data['grand_total'] = round(grand_total, 2)
        sales_data['invoice_no'] = f"INV-{int(datetime.now().timestamp())}"
        sales_data['status'] = 'Draft'
        processed_items = []
        for item in sales_data.get('items', []):
            if not all(key in item for key in ['item_name', 'basePrice', 'quantity']):
                logger.error("Invalid item structure in sales invoice")
                return jsonify({"error": "Each item must include item_name, basePrice, and quantity"}), 400
            processed_addons = []
            if 'addons' in item and item['addons']:
                for addon in item['addons']:
                    if not all(key in addon for key in ['name1', 'addon_price', 'addon_quantity']):
                        logger.error("Invalid addon structure in sales invoice")
                        return jsonify({"error": "Each addon must include name1, addon_price, and addon_quantity"}), 400
                    processed_addons.append({
                        "addon_name": addon['name1'],
                        "addon_price": float(addon['addon_price']),
                        "addon_quantity": int(addon['addon_quantity']),
                        "addon_image": addon.get('addon_image', ''),
                        "size": addon.get('size', 'S')
                    })
            processed_combos = []
            if 'selectedCombos' in item and item['selectedCombos']:
                for combo in item['selectedCombos']:
                    if not all(key in combo for key in ['name1', 'combo_price']):
                        logger.error("Invalid combo structure in sales invoice")
                        return jsonify({"error": "Each combo must include name1 and combo_price"}), 400
                    processed_combos.append({
                        "name1": combo['name1'],
                        "combo_price": float(combo['combo_price']),
                        "combo_quantity": int(combo.get('combo_quantity', 1)),  # Added default combo_quantity
                        "combo_image": combo.get('combo_image', ''),
                        "size": combo.get('size', 'S'),
                        "selectedVariant": combo.get('selectedVariant', None)
                    })
            processed_items.append({
                "item_name": item['item_name'],
                "basePrice": float(item['basePrice']),
                "quantity": int(item['quantity']),
                "amount": float(item.get('amount', item['basePrice'])),
                "addons": processed_addons,
                "selectedCombos": processed_combos,
                "kitchen": item.get('kitchen', 'Main Kitchen'),
                "selectedSize": item.get('selectedSize', 'S')
            })
        sales_data['items'] = processed_items
        sales_data['created_at'] = datetime.now(UTC).isoformat()
        sales_id = sales_collection.insert_one(sales_data).inserted_id
        logger.info(f"Sales invoice created with ID: {sales_id}")
        return jsonify({
            "id": str(sales_id),
            "invoice_no": sales_data['invoice_no'],
            "net_total": sales_data['total'],
            "vat_amount": sales_data['vat_amount'],
            "grand_total": sales_data['grand_total']
        }), 201
    except Exception as e:
        logger.error(f"Error creating sales invoice: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales', methods=['GET'])
def get_all_sales():
    try:
        sales = list(sales_collection.find())
        sales = [convert_objectid_to_str(sale) for sale in sales]
        logger.info(f"Fetched {len(sales)} sales invoices")
        return jsonify(sales), 200
    except Exception as e:
        logger.error(f"Error fetching sales: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales/<invoice_no>', methods=['GET'])
def get_sale_by_invoice_no(invoice_no):
    try:
        sale = sales_collection.find_one({'invoice_no': invoice_no.strip()})
        if not sale:
            logger.warning(f"Sale not found: {invoice_no}")
            return jsonify({"error": "Invoice not found"}), 404
        sale = convert_objectid_to_str(sale)
        logger.info(f"Fetched sale: {invoice_no}")
        return jsonify(sale), 200
    except Exception as e:
        logger.error(f"Error fetching sale {invoice_no}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales/<invoice_no>/status', methods=['PUT'])
def update_sale_status(invoice_no):
    try:
        data = request.get_json()
        status = data.get('status')
        if not status:
            return jsonify({"error": "Status is required"}), 400
        result = sales_collection.update_one(
            {'invoice_no': invoice_no.strip()},
            {'$set': {'status': status, 'modified_at': datetime.now(UTC).isoformat()}}
        )
        if result.matched_count == 0:
            logger.warning(f"Sale not found for status update: {invoice_no}")
            return jsonify({"error": "Invoice not found"}), 404
        logger.info(f"Sale status updated: {invoice_no} to {status}")
        return jsonify({"message": "Sale status updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating sale status {invoice_no}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tables', methods=['GET'])
def get_tables():
    try:
        tables = list(tables_collection.find())
        tables = [convert_objectid_to_str(table) for table in tables]
        logger.info(f"Fetched {len(tables)} tables")
        return jsonify({"message": tables}), 200
    except Exception as e:
        logger.error(f"Error fetching tables: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tables', methods=['POST'])
def add_table():
    try:
        data = request.get_json()
        table_number = data.get("table_number")
        number_of_chairs = data.get("number_of_chairs")
        if not table_number or not number_of_chairs:
            logger.error("Missing table_number or number_of_chairs")
            return jsonify({"error": "Table number and number of chairs are required"}), 400
        if tables_collection.find_one({"table_number": table_number}):
            logger.warning(f"Table number already exists: {table_number}")
            return jsonify({"error": "Table number already exists"}), 400
        new_table = {
            "table_number": table_number,
            "number_of_chairs": int(number_of_chairs),
            "created_at": datetime.now(UTC).isoformat()
        }
        tables_collection.insert_one(new_table)
        logger.info(f"Table added: {table_number}")
        return jsonify({"message": "Table added successfully"}), 201
    except Exception as e:
        logger.error(f"Error adding table: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tables/<table_number>', methods=['PUT'])
def update_table(table_number):
    try:
        data = request.get_json()
        number_of_chairs = data.get("number_of_chairs")
        if not number_of_chairs:
            return jsonify({"error": "Number of chairs is required"}), 400
        result = tables_collection.update_one(
            {"table_number": table_number},
            {"$set": {"number_of_chairs": int(number_of_chairs), "modified_at": datetime.now(UTC).isoformat()}}
        )
        if result.matched_count == 0:
            logger.warning(f"Table not found for update: {table_number}")
            return jsonify({"error": "Table not found"}), 404
        logger.info(f"Table updated: {table_number}")
        return jsonify({"message": "Table updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating table {table_number}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tables/<table_number>', methods=['DELETE'])
def delete_table(table_number):
    try:
        result = tables_collection.delete_one({"table_number": table_number})
        if result.deleted_count == 0:
            logger.warning(f"Table not found: {table_number}")
            return jsonify({"error": "Table not found"}), 404
        logger.info(f"Table deleted: {table_number}")
        return jsonify({"message": "Table deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting table {table_number}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/create_opening_entry', methods=['POST'])
def create_opening_entry():
    """Create a POS opening entry."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "No data provided", "status": "error"}), 400
        required_fields = ['period_start_date', 'posting_date', 'company', 'user', 'balance_details']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            return jsonify({"message": f"Missing fields: {', '.join(missing_fields)}", "status": "error"}), 400
        balance_details = data['balance_details']
        if not isinstance(balance_details, list):
            return jsonify({"message": "balance_details must be a list", "status": "error"}), 400
        for detail in balance_details:
            if not all(key in detail for key in ['mode_of_payment', 'opening_amount']):
                return jsonify({"message": "Each balance detail must have mode_of_payment and opening_amount", "status": "error"}), 400
            detail['opening_amount'] = float(detail['opening_amount'])
        data['creation'] = datetime.now(UTC).isoformat()
        data['modified'] = data['creation']
        data['name'] = f"OPEN-{int(datetime.now().timestamp())}"
        data['status'] = data.get('status', 'Draft')
        data['docstatus'] = data.get('docstatus', 0)
        data['pos_profile'] = data.get('pos_profile', 'POS-001')
        result = opening_collection.insert_one(data)

        # Update the user's last_opening_entry_time
        username = data['user']
        user = users_collection.find_one({"firstName": username})
        if user:
            users_collection.update_one(
                {"_id": user['_id']},
                {"$set": {"last_opening_entry_time": datetime.now(UTC).isoformat()}}
            )
            logger.info(f"Updated last_opening_entry_time for user: {username}")

        logger.info(f"POS opening entry created: {data['name']}")
        return jsonify({"message": {"name": data['name'], "status": "success"}}), 201
    except Exception as e:
        logger.error(f"Error in create_opening_entry: {str(e)}")
        return jsonify({"message": f"Server error: {str(e)}", "status": "error"}), 500

@app.route('/api/get_pos_opening_entries', methods=['POST'])
def get_pos_opening_entries():
    """Fetch POS opening entries by profile."""
    try:
        data = request.get_json()
        if not data or 'pos_profile' not in data:
            return jsonify({"message": "POS profile is required", "status": "error"}), 400
        pos_profile = data['pos_profile']
        entries = list(opening_collection.find({"pos_profile": pos_profile}))
        entries = [convert_objectid_to_str(entry) for entry in entries]
        logger.info(f"Fetched {len(entries)} POS opening entries for profile: {pos_profile}")
        return jsonify({"message": entries, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error in get_pos_opening_entries: {str(e)}")
        return jsonify({"message": f"Server error: {str(e)}", "status": "error"}), 500

@app.route('/api/get_pos_invoices', methods=['POST'])
def get_pos_invoices():
    """Fetch POS invoices for a given opening entry."""
    try:
        data = request.get_json()
        pos_opening_entry = data.get('pos_opening_entry')
        if not pos_opening_entry:
            return jsonify({"message": "POS opening entry is required", "status": "error"}), 400
        opening_entry = opening_collection.find_one({"name": pos_opening_entry})
        if not opening_entry:
            return jsonify({"message": "Opening entry not found", "status": "error"}), 404
        period_start = opening_entry['period_start_date']
        invoices = list(sales_collection.find({"date": {"$gte": period_start}}))
        invoices = [convert_objectid_to_str(inv) for inv in invoices]
        total = sum(float(inv['grand_total']) for inv in invoices)
        net_total = sum(float(inv['total']) for inv in invoices)
        total_qty = sum(sum(item['quantity'] for item in inv['items']) for inv in invoices)
        taxes = [{"account_head": "VAT", "rate": 10, "amount": total - net_total}]
        response = {
            "invoices": [{"pos_invoice": inv['invoice_no'], "grand_total": inv['grand_total'], "posting_date": inv['date'], "customer": inv['customer']} for inv in invoices],
            "taxes": taxes,
            "grand_total": total,
            "net_total": net_total,
            "total_quantity": total_qty,
            "status": "success"
        }
        logger.info(f"Fetched POS invoices for opening entry: {pos_opening_entry}")
        return jsonify({"message": response}), 200
    except Exception as e:
        logger.error(f"Error in get_pos_invoices: {str(e)}")
        return jsonify({"message": f"Error: {str(e)}", "status": "error"}), 500

@app.route('/api/create_closing_entry', methods=['POST'])
def create_closing_entry():
    """Create a POS closing entry."""
    try:
        data = request.get_json()
        required_fields = ['pos_opening_entry', 'posting_date', 'period_end_date', 'pos_transactions', 'payment_reconciliation', 'taxes', 'grand_total', 'net_total', 'total_quantity']
        if not data or not all(field in data for field in required_fields):
            return jsonify({"message": f"Missing fields: {', '.join([f for f in required_fields if f not in data])}", "status": "error"}), 400
        opening_entry = opening_collection.find_one({"name": data['pos_opening_entry']})
        if not opening_entry:
            return jsonify({"message": "Opening entry not found", "status": "error"}), 404
        data['creation'] = datetime.now(UTC).isoformat()
        data['modified'] = data['creation']
        data['name'] = f"CLOSE-{int(datetime.now().timestamp())}"
        data['status'] = 'Draft'
        data['docstatus'] = 0
        result = pos_closing_collection.insert_one(data)
        logger.info(f"POS closing entry created: {data['name']}")
        return jsonify({"message": {"name": data['name'], "status": "success", "message": "Closing Entry created"}}), 201
    except Exception as e:
        logger.error(f"Error in create_closing_entry: {str(e)}")
        return jsonify({"message": f"Error: {str(e)}", "status": "error"}), 500

@app.route('/api/send-email', methods=['POST', 'OPTIONS'])
def send_email():
    """Send an email with HTML content."""
    if request.method == 'OPTIONS':
        response = jsonify({"success": True})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 200
    try:
        data = request.get_json()
        logger.info(f"Received email request: {data}")
        if not data:
            logger.error("No data received in send-email request")
            return jsonify({"success": False, "message": "No data provided"}), 400
        to_email = data.get('to')
        subject = data.get('subject')
        html_content = data.get('html')
        if not all([to_email, subject, html_content]):
            logger.error("Missing required email fields")
            return jsonify({"success": False, "message": "Missing required fields: to, subject, html"}), 400
        msg = MIMEMultipart('alternative')
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {to_email}")
        return jsonify({"success": True, "message": "Email sent successfully"}), 200
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication Error: {str(e)}")
        return jsonify({"success": False, "message": "Email authentication failed"}), 401
    except smtplib.SMTPException as e:
        logger.error(f"SMTP Error: {str(e)}")
        return jsonify({"success": False, "message": f"SMTP error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}")
        return jsonify({"success": False, "message": f"Failed to send email: {str(e)}"}), 500

@app.route('/api/export-all-to-excel', methods=['GET'])
def export_all_to_excel():
    """Export all data to an Excel file."""
    try:
        wb = openpyxl.Workbook()
        wb.remove(wb.active)
        collections = {
            'customers': customers_collection,
            'items': items_collection,
            'sales': sales_collection,
            'tables': tables_collection,
            'users': users_collection,
            'picked_up_items': picked_up_collection,
            'pos_opening_entries': opening_collection,
            'pos_closing_entries': pos_closing_collection,
            'system_settings': settings_collection,
            'kitchens': kitchens_collection,
            'item_groups': item_groups_collection
        }
        for collection_name, collection in collections.items():
            ws = wb.create_sheet(title=collection_name)
            data = list(collection.find())
            if not data:
                ws.append(['No data'])
                continue
            sample_doc = data[0]
            headers = list(sample_doc.keys())
            ws.append(headers)
            for doc in data:
                row = [str(doc.get(header, '')) if isinstance(doc.get(header), (ObjectId, list, dict)) else doc.get(header, '') for header in headers]
                ws.append(row)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        filename = f'restaurant_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        logger.info(f"Exported data to Excel: {filename}")
        return Response(
            buffer.getvalue(),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        logger.error(f"Error exporting to Excel: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/backup-to-excel', methods=['GET'])
def backup_to_excel():
    """Create a backup and serve it as a download."""
    try:
        success, message = create_backup()
        if not success:
            return jsonify({"error": message}), 500
        filename = message.split(': ')[1]
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(file_path, 'rb') as f:
            file_data = f.read()
        return Response(
            file_data,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        logger.error(f"Error serving backup file {filename}: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/kitchens', methods=['GET'])
def get_kitchens():
    """Fetch all kitchens."""
    try:
        kitchens = list(kitchens_collection.find())
        kitchens = [convert_objectid_to_str(kitchen) for kitchen in kitchens]
        logger.info(f"Fetched {len(kitchens)} kitchens")
        return jsonify(kitchens), 200
    except Exception as e:
        logger.error(f"Error fetching kitchens: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/kitchens', methods=['POST'])
def create_kitchen():
    """Create a new kitchen."""
    try:
        data = request.get_json()
        if not data or 'kitchen_name' not in data:
            logger.error("Missing kitchen_name in request")
            return jsonify({"error": "Kitchen name is required"}), 400
        kitchen_name = data['kitchen_name']
        if kitchens_collection.find_one({"kitchen_name": kitchen_name}):
            logger.warning(f"Kitchen already exists: {kitchen_name}")
            return jsonify({"error": "Kitchen name already exists"}), 400
        new_kitchen = {
            "kitchen_name": kitchen_name,
            "created_at": datetime.now(UTC).isoformat()
        }
        result = kitchens_collection.insert_one(new_kitchen)
        logger.info(f"Kitchen created: {kitchen_name}")
        return jsonify({"message": "Kitchen created successfully", "id": str(result.inserted_id)}), 201
    except Exception as e:
        logger.error(f"Error creating kitchen: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/kitchens/<kitchen_id>', methods=['PUT'])
def update_kitchen(kitchen_id):
    """Update an existing kitchen."""
    try:
        data = request.get_json()
        if not data or 'kitchen_name' not in data:
            logger.error("Missing kitchen_name in request")
            return jsonify({"error": "Kitchen name is required"}), 400
        try:
            object_id = ObjectId(kitchen_id)
        except Exception:
            logger.error(f"Invalid kitchen ID: {kitchen_id}")
            return jsonify({"error": "Invalid kitchen ID"}), 400
        result = kitchens_collection.update_one(
            {'_id': object_id},
            {'$set': {'kitchen_name': data['kitchen_name'], 'modified_at': datetime.now(UTC).isoformat()}}
        )
        if result.matched_count == 0:
            logger.warning(f"Kitchen not found for update: {kitchen_id}")
            return jsonify({"error": "Kitchen not found"}), 404
        logger.info(f"Kitchen updated: {kitchen_id}")
        return jsonify({"message": "Kitchen updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating kitchen {kitchen_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/kitchens/<kitchen_id>', methods=['DELETE'])
def delete_kitchen(kitchen_id):
    """Delete a kitchen."""
    try:
        try:
            object_id = ObjectId(kitchen_id)
        except Exception:
            logger.error(f"Invalid kitchen ID: {kitchen_id}")
            return jsonify({"error": "Invalid kitchen ID"}), 400
        result = kitchens_collection.delete_one({'_id': object_id})
        if result.deleted_count == 0:
            logger.warning(f"Kitchen not found for deletion: {kitchen_id}")
            return jsonify({"error": "Kitchen not found"}), 404
        logger.info(f"Kitchen deleted: {kitchen_id}")
        return jsonify({"message": "Kitchen deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting kitchen {kitchen_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/item-groups', methods=['GET'])
def get_item_groups():
    """Fetch all item groups."""
    try:
        item_groups = list(item_groups_collection.find())
        item_groups = [convert_objectid_to_str(group) for group in item_groups]
        logger.info(f"Fetched {len(item_groups)} item groups")
        return jsonify(item_groups), 200
    except Exception as e:
        logger.error(f"Error fetching item groups: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/item-groups', methods=['POST'])
def create_item_group():
    """Create a new item group."""
    try:
        data = request.get_json()
        if not data or 'group_name' not in data:
            logger.error("Missing group_name in request")
            return jsonify({"error": "Group name is required"}), 400
        group_name = data['group_name']
        if item_groups_collection.find_one({"group_name": group_name}):
            logger.warning(f"Item group already exists: {group_name}")
            return jsonify({"error": "Item group name already exists"}), 400
        new_group = {
            "group_name": group_name,
            "created_at": datetime.now(UTC).isoformat()
        }
        result = item_groups_collection.insert_one(new_group)
        logger.info(f"Item group created: {group_name}")
        return jsonify({"message": "Item group created successfully", "id": str(result.inserted_id)}), 201
    except Exception as e:
        logger.error(f"Error creating item group: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/item-groups/<group_id>', methods=['PUT'])
def update_item_group(group_id):
    """Update an existing item group."""
    try:
        data = request.get_json()
        if not data or 'group_name' not in data:
            logger.error("Missing group_name in request")
            return jsonify({"error": "Group name is required"}), 400
        try:
            object_id = ObjectId(group_id)
        except Exception:
            logger.error(f"Invalid group ID: {group_id}")
            return jsonify({"error": "Invalid group ID"}), 400
        result = item_groups_collection.update_one(
            {'_id': object_id},
            {'$set': {'group_name': data['group_name'], 'modified_at': datetime.now(UTC).isoformat()}}
        )
        if result.matched_count == 0:
            logger.warning(f"Item group not found for update: {group_id}")
            return jsonify({"error": "Item group not found"}), 404
        logger.info(f"Item group updated: {group_id}")
        return jsonify({"message": "Item group updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating item group {group_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/item-groups/<group_id>', methods=['DELETE'])
def delete_item_group(group_id):
    """Delete an item group."""
    try:
        try:
            object_id = ObjectId(group_id)
        except Exception:
            logger.error(f"Invalid group ID: {group_id}")
            return jsonify({"error": "Invalid group ID"}), 400
        result = item_groups_collection.delete_one({'_id': object_id})
        if result.deleted_count == 0:
            logger.warning(f"Item group not found for deletion: {group_id}")
            return jsonify({"error": "Item group not found"}), 404
        logger.info(f"Item group deleted: {group_id}")
        return jsonify({"message": "Item group deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting item group {group_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/items/nutrition', methods=['POST', 'OPTIONS'])
def save_item_nutrition():
    """Save or update ingredients data for an item, addon, or combo across all instances."""
    if request.method == 'OPTIONS':
        response = jsonify({"success": True})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 200

    try:
        data = request.get_json()
        if not data:
            logger.error("No data provided for saving ingredients")
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        required_fields = ['item_name', 'type', 'instances', 'ingredients']
        for field in required_fields:
            if field not in data or data[field] is None:
                logger.error(f"Missing or null required field: {field}")
                return jsonify({"error": f"Missing or null required field: {field}"}), 400

        item_name = data['item_name']
        item_type = data['type']
        instances = data['instances']
        ingredients = data['ingredients']

        # Validate type
        if item_type not in ['item', 'addon', 'combo']:
            logger.error(f"Invalid type: {item_type}")
            return jsonify({"error": "Invalid type, must be 'item', 'addon', or 'combo'"}), 400

        # Validate ingredients
        if not isinstance(ingredients, list):
            logger.error("Ingredients must be a list of objects")
            return jsonify({"error": "Ingredients must be a list of objects"}), 400

        for ingredient in ingredients:
            if not isinstance(ingredient, dict) or not all(key in ingredient for key in ['name', 'small', 'medium', 'large', 'weight', 'nutrition']):
                logger.error("Each ingredient must be an object with name, small, medium, large, weight, and nutrition fields")
                return jsonify({"error": "Each ingredient must be an object with required fields"}), 400

        # Filter out ingredients with empty names
        filtered_ingredients = [ing for ing in ingredients if ing['name'].strip()]

        # Update all instances
        updated_count = 0
        for instance in instances:
            item_id = instance['item_id']
            index = instance.get('index')

            # Find the item by item_id
            item = items_collection.find_one({'_id': ObjectId(item_id)})
            if not item:
                logger.warning(f"Item not found: {item_id}")
                continue

            # Prepare update
            update_query = {'_id': ObjectId(item_id)}
            update_data = {
                '$set': {
                    'modified_at': datetime.now().isoformat()
                }
            }

            if item_type == 'item':
                update_data['$set']['ingredients'] = filtered_ingredients
            elif item_type == 'addon':
                if index is None or not isinstance(index, int):
                    logger.error(f"Index is required for addons in item_id: {item_id}")
                    continue
                update_data['$set'][f'addons.{index}.ingredients'] = filtered_ingredients
            elif item_type == 'combo':
                if index is None or not isinstance(index, int):
                    logger.error(f"Index is required for combos in item_id: {item_id}")
                    continue
                update_data['$set'][f'combos.{index}.ingredients'] = filtered_ingredients

            # Perform the update
            result = items_collection.update_one(update_query, update_data)
            if result.matched_count > 0:
                updated_count += 1
            else:
                logger.warning(f"Item not found for ingredients update: {item_id}")

        if updated_count == 0:
            logger.error(f"No items updated for {item_type}: {item_name}")
            return jsonify({"error": "No items updated, please check instance data"}), 400

        logger.info(f"Ingredients updated for {item_type}: {item_name} across {updated_count} instances")
        return jsonify({"message": "Ingredients saved successfully"}), 200

    except Exception as e:
        logger.error(f"Error saving ingredients for {item_name}: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/items/nutrition/<item_name>', methods=['GET', 'DELETE', 'OPTIONS'])
def handle_item_nutrition(item_name):
    """Fetch or delete ingredients and nutrition data for an item, addon, or combo."""
    if request.method == 'OPTIONS':
        response = jsonify({"success": True})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Instances'
        return response, 200

    try:
        item_type = request.args.get('type')
        item_id = request.args.get('item_id')
        index = request.args.get('index')

        if request.method == 'GET':
            if not item_type or not item_id:
                logger.error("Type and item_id are required")
                return jsonify({"error": "Type and item_id are required"}), 400

            if item_type not in ['item', 'addon', 'combo']:
                logger.error(f"Invalid type: {item_type}")
                return jsonify({"error": "Invalid type, must be 'item', 'addon', or 'combo'"}), 400

            # Find the item by item_id
            item = items_collection.find_one({'_id': ObjectId(item_id)})
            if not item:
                logger.warning(f"Item not found: {item_id}")
                return jsonify({"error": "Item not found"}), 404

            ingredients = []
            if item_type == 'item':
                ingredients = item.get('ingredients', [])
            elif item_type == 'addon':
                if index is None or not index.isdigit():
                    logger.error("Index is required for addons")
                    return jsonify({"error": "Index is required for addons"}), 400
                index = int(index)
                if index < len(item.get('addons', [])):
                    ingredients = item['addons'][index].get('ingredients', [])
            elif item_type == 'combo':
                if index is None or not index.isdigit():
                    logger.error("Index is required for combos")
                    return jsonify({"error": "Index is required for combos"}), 400
                index = int(index)
                if index < len(item.get('combos', [])):
                    ingredients = item['combos'][index].get('ingredients', [])

            response_data = {
                'ingredients': ingredients,
                'nutrition': {}  # Kept for backward compatibility, can be removed if not used
            }
            logger.info(f"Fetched nutrition data for {item_type}: {item_name}")
            return jsonify(response_data), 200

        if request.method == 'DELETE':
            instances = request.headers.get('X-Instances')
            if not instances:
                logger.error("Instances header is required for DELETE")
                return jsonify({"error": "Instances header is required"}), 400

            try:
                instances = json.loads(instances)
            except json.JSONDecodeError:
                logger.error("Invalid instances header format")
                return jsonify({"error": "Invalid instances header format"}), 400

            if item_type not in ['item', 'addon', 'combo']:
                logger.error(f"Invalid type: {item_type}")
                return jsonify({"error": "Invalid type, must be 'item', 'addon', or 'combo'"}), 400

            # Update all instances
            deleted_count = 0
            for instance in instances:
                item_id = instance['item_id']
                index = instance.get('index')

                # Find the item by item_id
                item = items_collection.find_one({'_id': ObjectId(item_id)})
                if not item:
                    logger.warning(f"Item not found: {item_id}")
                    continue

                update_query = {'_id': ObjectId(item_id)}
                update_data = {
                    '$unset': {},
                    '$set': {
                        'modified_at': datetime.now().isoformat()
                    }
                }

                if item_type == 'item':
                    update_data['$unset']['ingredients'] = ''
                elif item_type == 'addon':
                    if index is None or not isinstance(index, int):
                        logger.error(f"Index is required for addons in item_id: {item_id}")
                        continue
                    update_data['$unset'][f'addons.{index}.ingredients'] = ''
                elif item_type == 'combo':
                    if index is None or not isinstance(index, int):
                        logger.error(f"Index is required for combos in item_id: {item_id}")
                        continue
                    update_data['$unset'][f'combos.{index}.ingredients'] = ''

                result = items_collection.update_one(update_query, update_data)
                if result.matched_count > 0:
                    deleted_count += 1
                else:
                    logger.warning(f"Item not found for nutrition deletion: {item_id}")

            if deleted_count == 0:
                logger.error(f"No items updated for deletion of {item_type}: {item_name}")
                return jsonify({"error": "No items updated for deletion, please check instance data"}), 400

            logger.info(f"Nutrition and ingredients cleared for {item_type}: {item_name} across {deleted_count} instances")
            return jsonify({"message": "Nutrition and ingredients cleared successfully"}), 200

    except Exception as e:
        logger.error(f"Error handling nutrition for {item_name}: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500




@app.route('/api/kitchen-saved', methods=['POST'])
def save_kitchen_order():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        required_fields = ['customerName', 'phoneNumber', 'cartItems', 'timestamp', 'orderType']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

        order = {
            'customerName': data['customerName'],
            'tableNumber': data.get('tableNumber', 'N/A') if data['orderType'] == 'Dine In' else 'N/A',
            'chairsBooked': data.get('chairsBooked', []) if data['orderType'] == 'Dine In' else [],
            'phoneNumber': data['phoneNumber'],
            'deliveryAddress': data.get('deliveryAddress', {}),
            'whatsappNumber': data.get('whatsappNumber', ''),
            'email': data.get('email', ''),
            'cartItems': [],
            'timestamp': data['timestamp'],
            'orderType': data['orderType'],
            'createdAt': datetime.utcnow()
        }

        for item in data['cartItems']:
            required_kitchens = set()
            if 'kitchen' in item:
                required_kitchens.add(item['kitchen'])
            for addon_name, qty in item.get('addonQuantities', {}).items():
                if qty > 0 and 'addonVariants' in item and addon_name in item['addonVariants']:
                    addon = item['addonVariants'][addon_name]
                    if 'kitchen' in addon:
                        required_kitchens.add(addon['kitchen'])
            for combo_name, qty in item.get('comboQuantities', {}).items():
                if qty > 0 and 'comboVariants' in item and combo_name in item['comboVariants']:
                    combo = item['comboVariants'][combo_name]
                    if 'kitchen' in combo:
                        required_kitchens.add(combo['kitchen'])
            item['requiredKitchens'] = list(required_kitchens)
            item['kitchenStatuses'] = {kitchen: 'Pending' for kitchen in required_kitchens}
            order['cartItems'].append(item)

        result = kitchen_saved_collection.insert_one(order)
        order['_id'] = str(result.inserted_id)

        return jsonify({'success': True, 'order_id': order['_id'], 'order': order}), 201

    except Exception as e:
        logger.error(f"Error in /api/kitchen-saved POST: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kitchen-saved', methods=['GET'])
def get_kitchen_orders():
    try:
        orders = list(kitchen_saved_collection.find())
        for order in orders:
            order['_id'] = str(order['_id'])
            order['cartItems'] = order.get('cartItems', [])
            for item in order['cartItems']:
                item['kitchenStatuses'] = item.get('kitchenStatuses', {})
                item['requiredKitchens'] = item.get('requiredKitchens', [])

        return jsonify({'success': True, 'orders': orders}), 200

    except Exception as e:
        logger.error(f"Error in /api/kitchen-saved GET: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kitchen-saved/<order_id>', methods=['DELETE'])
def delete_kitchen_order(order_id):
    try:
        result = kitchen_saved_collection.delete_one({'_id': ObjectId(order_id)})
        if result.deleted_count == 0:
            logger.warning(f"Order not found: {order_id}")
            return jsonify({'success': False, 'error': 'Order not found'}), 404
        logger.info(f"Order deleted: {order_id}")
        return jsonify({'success': True, 'message': 'Order deleted successfully'}), 200
    except Exception as e:
        logger.error(f"Error deleting order {order_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kitchen-saved/<order_id>/status', methods=['PATCH'])
def update_item_status(order_id):
    try:
        data = request.get_json()
        if not data or 'itemId' not in data or 'status' not in data or 'kitchen' not in data:
            return jsonify({'success': False, 'error': 'Missing itemId, status, or kitchen'}), 400

        item_id = data['itemId']
        new_status = data['status']
        kitchen = data['kitchen']

        order = kitchen_saved_collection.find_one({'_id': ObjectId(order_id)})
        if not order:
            return jsonify({'success': False, 'error': 'Order not found'}), 404

        item = next((item for item in order['cartItems'] if item['id'] == item_id), None)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404

        if kitchen not in item['requiredKitchens']:
            return jsonify({'success': False, 'error': 'Kitchen not required for this item'}), 400

        item['kitchenStatuses'][kitchen] = new_status

        all_picked_up = all(status == 'PickedUp' for status in item['kitchenStatuses'].values())

        if all_picked_up:
            result = kitchen_saved_collection.update_one(
                {'_id': ObjectId(order_id)},
                {'$pull': {'cartItems': {'id': item_id}}}
            )
        else:
            result = kitchen_saved_collection.update_one(
                {'_id': ObjectId(order_id), 'cartItems.id': item_id},
                {'$set': {'cartItems.$.kitchenStatuses': item['kitchenStatuses']}}
            )

        if result.modified_count == 0:
            return jsonify({'success': False, 'error': 'Item not found or status not updated'}), 404

        updated_order = kitchen_saved_collection.find_one({'_id': ObjectId(order_id)})
        if updated_order and len(updated_order.get('cartItems', [])) == 0:
            kitchen_saved_collection.delete_one({'_id': ObjectId(order_id)})

        return jsonify({'success': True}), 200

    except Exception as e:
        logger.error(f"Error in /api/kitchen-saved/{order_id}/status: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kitchen-saved/<order_id>/items/<item_id>/mark-prepared', methods=['POST'])
def mark_item_prepared(order_id, item_id):
    try:
        data = request.get_json()
        kitchen = data.get('kitchen')
        if not kitchen:
            return jsonify({'success': False, 'error': 'Kitchen not provided'}), 400

        order = kitchen_saved_collection.find_one({'_id': ObjectId(order_id)})
        if not order:
            return jsonify({'success': False, 'error': 'Order not found'}), 404

        item = next((item for item in order['cartItems'] if item['id'] == item_id), None)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404

        if kitchen not in item['requiredKitchens']:
            return jsonify({'success': False, 'error': 'Kitchen not required for this item'}), 400

        if item['kitchenStatuses'][kitchen] in ['Prepared', 'PickedUp']:
            return jsonify({'success': False, 'error': 'Kitchen already marked as prepared or picked up'}), 400

        item['kitchenStatuses'][kitchen] = 'Prepared'

        kitchen_saved_collection.update_one(
            {'_id': ObjectId(order_id), 'cartItems.id': item_id},
            {'$set': {'cartItems.$.kitchenStatuses': item['kitchenStatuses']}}
        )

        return jsonify({'success': True, 'status': 'Prepared'}), 200

    except Exception as e:
        logger.error(f"Error in /api/kitchen-saved/{order_id}/items/{item_id}/mark-prepared: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/picked-up-items', methods=['POST'])
def save_picked_up_item():
    try:
        item_data = request.get_json()
        if not item_data:
            logger.error("No data provided for picked-up items")
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        customer_name = item_data.get('customerName', 'Unknown')
        table_number = item_data.get('tableNumber', 'N/A')
        pickup_time = datetime.utcnow().isoformat()
        new_item = {
            'itemName': item_data.get('itemName', 'Unknown'),
            'quantity': item_data.get('quantity', 0),
            'category': item_data.get('category', 'N/A'),
            'kitchen': item_data.get('kitchen', 'Unknown'),
            'addonCounts': item_data.get('addonCounts', []),
            'selectedCombos': item_data.get('selectedCombos', [])
        }
        existing_entry = picked_up_collection.find_one({'customerName': customer_name, 'tableNumber': table_number})
        if existing_entry:
            updated_items = existing_entry.get('items', [])
            updated_items.append(new_item)
            result = picked_up_collection.update_one(
                {'_id': existing_entry['_id']},
                {'$set': {'items': updated_items, 'pickupTime': pickup_time, 'modified_at': datetime.utcnow().isoformat()}}
            )
            logger.info(f"Picked-up items updated for customer: {customer_name}, table: {table_number}")
            return jsonify({
                'success': True,
                'message': 'Picked-up items updated successfully',
                'id': str(existing_entry['_id'])
            }), 200
        else:
            picked_up_data = {
                'customerName': customer_name,
                'tableNumber': table_number,
                'items': [new_item],
                'pickupTime': pickup_time,
                'created_at': datetime.utcnow().isoformat()
            }
            result = picked_up_collection.insert_one(picked_up_data)
            logger.info(f"Picked-up items saved with ID: {result.inserted_id}")
            return jsonify({
                'success': True,
                'message': 'Picked-up items saved successfully',
                'id': str(result.inserted_id)
            }), 201
    except Exception as e:
        logger.error(f"Error saving picked-up items: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/picked-up-items', methods=['GET'])
def get_picked_up_items():
    try:
        picked_up_items = list(picked_up_collection.find())
        picked_up_items = [convert_objectid_to_str(item) for item in picked_up_items]
        logger.info(f"Fetched {len(picked_up_items)} picked-up items")
        return jsonify({'success': True, 'pickedUpItems': picked_up_items}), 200
    except Exception as e:
        logger.error(f"Error fetching picked-up items: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/picked-up-items/<entry_id>', methods=['DELETE'])
def delete_picked_up_item(entry_id):
    try:
        result = picked_up_collection.delete_one({'_id': ObjectId(entry_id)})
        if result.deleted_count == 0:
            logger.warning(f"Picked-up entry not found: {entry_id}")
            return jsonify({"error": "Picked-up entry not found"}), 404
        logger.info(f"Picked-up entry deleted: {entry_id}")
        return jsonify({"message": "Picked-up entry deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting picked-up entry {entry_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500



@app.route('/api/variants', methods=['POST'])
def create_variants():
    try:
        # Get the variant data from the request
        data = request.get_json()
        if not data or not data.get('heading') or not isinstance(data.get('subheadings'), list):
            return jsonify({'error': 'Variant must have a heading and a list of subheadings'}), 400

        # Validate data
        for subheading in data['subheadings']:
            if not subheading.get('name'):
                return jsonify({'error': 'Each subheading must have a name'}), 400
            # Validate price if provided
            if 'price' in subheading and subheading['price'] is not None:
                try:
                    subheading['price'] = float(subheading['price'])
                except (ValueError, TypeError):
                    return jsonify({'error': f"Invalid price for subheading {subheading['name']}"}), 400
            # Validate image if provided
            if 'image' in subheading and subheading['image'] is not None:
                if not isinstance(subheading['image'], str):
                    return jsonify({'error': f"Image for subheading {subheading['name']} must be a string"}), 400
            # Validate dropdown if provided
            if 'dropdown' in subheading and not isinstance(subheading['dropdown'], bool):
                return jsonify({'error': f"Dropdown for subheading {subheading['name']} must be a boolean"}), 400

        # Insert variant into MongoDB
        result = variants_collection.insert_one(data)
        return jsonify({
            'message': 'Variant created successfully',
            'inserted_id': str(result.inserted_id)
        }), 201

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

# Route to get all variants
@app.route('/api/variants', methods=['GET'])
def get_variants():
    try:
        # Retrieve all variants from MongoDB
        variants = list(variants_collection.find({}, {'_id': 1, 'heading': 1, 'subheadings': 1, 'activeSection': 1}))
        # Convert ObjectId to string
        for variant in variants:
            variant['_id'] = str(variant['_id'])
        return jsonify(variants), 200
    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

# Route to get a specific variant by ID
@app.route('/api/variants/<id>', methods=['GET'])
def get_variant(id):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(id):
            return jsonify({'error': 'Invalid variant ID'}), 400
        variant = variants_collection.find_one({'_id': ObjectId(id)}, {'_id': 0, 'heading': 1, 'subheadings': 1, 'activeSection': 1})
        if not variant:
            return jsonify({'error': 'Variant not found'}), 404
        return jsonify(variant), 200
    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

# Route to update a variant
@app.route('/api/variants/<id>', methods=['PUT'])
def update_variant(id):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(id):
            return jsonify({'error': 'Invalid variant ID'}), 400
        data = request.get_json()
        if not data or not data.get('heading') or not isinstance(data.get('subheadings'), list):
            return jsonify({'error': 'Variant must have a heading and a list of subheadings'}), 400

        # Validate data
        for subheading in data['subheadings']:
            if not subheading.get('name'):
                return jsonify({'error': 'Each subheading must have a name'}), 400
            if 'price' in subheading and subheading['price'] is not None:
                try:
                    subheading['price'] = float(subheading['price'])
                except (ValueError, TypeError):
                    return jsonify({'error': f"Invalid price for subheading {subheading['name']}"}), 400
            if 'image' in subheading and subheading['image'] is not None:
                if not isinstance(subheading['image'], str):
                    return jsonify({'error': f"Image for subheading {subheading['name']} must be a string"}), 400
            if 'dropdown' in subheading and not isinstance(subheading['dropdown'], bool):
                return jsonify({'error': f"Dropdown for subheading {subheading['name']} must be a boolean"}), 400

        # Update variant in MongoDB
        result = variants_collection.update_one(
            {'_id': ObjectId(id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Variant not found'}), 404
        return jsonify({'message': 'Variant updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

# Route to delete a variant by ID
@app.route('/api/variants/<id>', methods=['DELETE'])
def delete_variant(id):
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(id):
            return jsonify({'error': 'Invalid variant ID'}), 400
        result = variants_collection.delete_one({'_id': ObjectId(id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'Variant not found'}), 404
        return jsonify({'message': 'Variant deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

# Route to delete a variant by heading
@app.route('/api/variants/heading/<heading>', methods=['DELETE'])
def delete_variant_by_heading(heading):
    try:
        result = variants_collection.delete_one({'heading': heading})
        return jsonify({'message': 'Variant deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500




VALID_COUNTRY_CODES = [
    '+91',  # India
    '+1',   # USA
    '+971', # UAE (Dubai)
    '+44',  # UK
    '+61',  # Australia
    # Add more country codes as needed
]

def generate_employee_id():
    """Generate a unique employee ID."""
    return str(uuid.uuid4())[:8]  # Simple 8-character UUID for employee ID

@app.route('/api/employees', methods=['GET'])
def get_employees():
    try:
        employees = list(employees_collection.find({}, {'_id': 0}))
        logger.info(f"Fetched {len(employees)} employees")
        return jsonify(employees), 200
    except Exception as e:
        logger.error(f"Error fetching employees: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees', methods=['POST'])
def create_employee():
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['name', 'phoneNumber', 'vehicleNumber', 'role']):
            return jsonify({'error': 'Missing required fields'}), 400

        phone_number = data['phoneNumber']
        if not any(phone_number.startswith(code) for code in VALID_COUNTRY_CODES):
            return jsonify({'error': 'Phone number must include a valid country code (e.g., +91, +1, +971)'}), 400

        code_length = len(next(code for code in VALID_COUNTRY_CODES if phone_number.startswith(code)))
        if len(phone_number) < code_length + 7:
            return jsonify({'error': 'Phone number is too short'}), 400

        employee_id = generate_employee_id()
        employee = {
            'employeeId': employee_id,
            'name': data['name'],
            'phoneNumber': phone_number,
            'vehicleNumber': data['vehicleNumber'],
            'role': data['role']
        }

        employees_collection.insert_one(employee)
        employee.pop('_id', None)
        logger.info(f"Created employee: {employee_id}")
        return jsonify({'message': 'Employee created successfully', 'employee': employee}), 201
    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<employee_id>', methods=['PUT'])
def update_employee(employee_id):
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['name', 'phoneNumber', 'vehicleNumber', 'role']):
            return jsonify({'error': 'Missing required fields'}), 400

        phone_number = data['phoneNumber']
        if not any(phone_number.startswith(code) for code in VALID_COUNTRY_CODES):
            return jsonify({'error': 'Phone number must include a valid country code (e.g., +91, +1, +971)'}), 400

        code_length = len(next(code for code in VALID_COUNTRY_CODES if phone_number.startswith(code)))
        if len(phone_number) < code_length + 7:
            return jsonify({'error': 'Phone number is too short'}), 400

        updated_employee = {
            'name': data['name'],
            'phoneNumber': phone_number,
            'vehicleNumber': data['vehicleNumber'],
            'role': data['role']
        }

        result = employees_collection.update_one(
            {'employeeId': employee_id},
            {'$set': updated_employee}
        )

        if result.matched_count == 0:
            return jsonify({'error': 'Employee not found'}), 404

        logger.info(f"Updated employee: {employee_id}")
        return jsonify({'message': 'Employee updated successfully'}), 200
    except Exception as e:
        logger.error(f"Error updating employee: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    try:
        result = employees_collection.delete_one({'employeeId': employee_id})
        if result.deleted_count == 0:
            return jsonify({'error': 'Employee not found'}), 404
        logger.info(f"Deleted employee: {employee_id}")
        return jsonify({'message': 'Employee deleted successfully'}), 200
    except Exception as e:
        logger.error(f"Error deleting employee: {str(e)}")
        return jsonify({'error': str(e)}), 500

def generate_unique_id():
    return str(uuid.uuid4())

@app.route('/api/activeorders', methods=['POST'])
def save_active_order():
    try:
        data = request.get_json()
        order_id = generate_unique_id()
        
        cart_items = data.get('cartItems', [])
        for item in cart_items:
            required_kitchens = set()
            if 'kitchen' in item:
                required_kitchens.add(item['kitchen'])
            for addon_name, qty in item.get('addonQuantities', {}).items():
                if qty > 0 and 'addonVariants' in item and addon_name in item['addonVariants']:
                    addon = item['addonVariants'][addon_name]
                    if 'kitchen' in addon:
                        required_kitchens.add(addon['kitchen'])
            for combo_name, qty in item.get('comboQuantities', {}).items():
                if qty > 0 and 'comboVariants' in item and combo_name in item['comboVariants']:
                    combo = item['comboVariants'][combo_name]
                    if 'kitchen' in combo:
                        required_kitchens.add(combo['kitchen'])
            item['requiredKitchens'] = list(required_kitchens)
            item['kitchenStatuses'] = {kitchen: 'Pending' for kitchen in required_kitchens}

        active_order = {
            'orderId': order_id,
            'customerName': data.get('customerName', 'N/A'),
            'tableNumber': data.get('tableNumber', 'N/A'),
            'chairsBooked': data.get('chairsBooked', []),
            'phoneNumber': data.get('phoneNumber', ''),
            'deliveryAddress': data.get('deliveryAddress', {}),
            'whatsappNumber': data.get('whatsappNumber', ''),
            'email': data.get('email', ''),
            'cartItems': cart_items,
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
            'orderType': data.get('orderType', 'Dine In'),
            'status': data.get('status', 'Pending'),
            'created_at': datetime.utcnow(),
            'deliveryPersonId': data.get('deliveryPersonId', ''),
            'pickedUpTime': None
        }
        
        result = activeorders_collection.insert_one(active_order)
        logger.info(f"Created order: {order_id}")
        return jsonify({'success': True, 'orderId': order_id}), 201
    except Exception as e:
        logger.error(f"Error saving active order: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/activeorders', methods=['GET'])
def get_active_orders():
    try:
        orders = list(activeorders_collection.find({}, {'_id': 0}))
        logger.info(f"Fetched {len(orders)} active orders")
        return jsonify(orders), 200
    except Exception as e:
        logger.error(f"Error fetching active orders: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/activeorders/<order_id>/items/<item_id>/mark-prepared', methods=['POST'])
def mark_item_prepared_active(order_id, item_id):
    try:
        data = request.get_json()
        kitchen = data.get('kitchen')
        if not kitchen:
            return jsonify({'success': False, 'error': 'Kitchen not provided'}), 400

        order = activeorders_collection.find_one({'orderId': order_id})
        if not order:
            return jsonify({'success': False, 'error': 'Order not found'}), 404

        item = next((item for item in order['cartItems'] if item['id'] == item_id), None)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404

        if kitchen not in item.get('requiredKitchens', []):
            return jsonify({'success': False, 'error': 'Kitchen not required for this item'}), 400

        if item.get('kitchenStatuses', {}).get(kitchen) in ['Prepared', 'PickedUp']:
            return jsonify({'success': False, 'error': 'Kitchen already marked as prepared or picked up'}), 400

        item['kitchenStatuses'][kitchen] = 'Prepared'

        activeorders_collection.update_one(
            {'orderId': order_id, 'cartItems.id': item_id},
            {'$set': {'cartItems.$.kitchenStatuses': item['kitchenStatuses']}}
        )

        return jsonify({'success': True, 'status': 'Prepared'}), 200
    except Exception as e:
        logger.error(f"Error in /api/activeorders/{order_id}/items/{item_id}/mark-prepared: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/activeorders/<order_id>/items/<item_id>/mark-pickedup', methods=['POST'])
def mark_item_pickedup_active(order_id, item_id):
    try:
        data = request.get_json()
        kitchen = data.get('kitchen')
        if not kitchen:
            return jsonify({'success': False, 'error': 'Kitchen not provided'}), 400

        order = activeorders_collection.find_one({'orderId': order_id})
        if not order:
            return jsonify({'success': False, 'error': 'Order not found'}), 404

        item = next((item for item in order['cartItems'] if item['id'] == item_id), None)
        if not item:
            return jsonify({'success': False, 'error': 'Item not found'}), 404

        if kitchen not in item.get('requiredKitchens', []):
            return jsonify({'success': False, 'error': 'Kitchen not required for this item'}), 400

        if item.get('kitchenStatuses', {}).get(kitchen) != 'Prepared':
            return jsonify({'success': False, 'error': 'Item must be prepared before picking up'}), 400

        item['kitchenStatuses'][kitchen] = 'PickedUp'

        all_picked_up = all(status == 'PickedUp' for status in item['kitchenStatuses'].values()) if item.get('kitchenStatuses') else False

        activeorders_collection.update_one(
            {'orderId': order_id, 'cartItems.id': item_id},
            {'$set': {'cartItems.$.kitchenStatuses': item['kitchenStatuses']}}
        )

        picked_up_data = {
            'customerName': order.get('customerName', 'Unknown'),
            'tableNumber': order.get('tableNumber', 'N/A'),
            'itemName': item.get('name', 'Unknown'),
            'quantity': item.get('quantity', 0),
            'category': item.get('category', 'N/A'),
            'kitchen': kitchen,
            'pickupTime': datetime.utcnow().isoformat(),
            'orderType': order.get('orderType', 'Dine In'),
            'addonCounts': [
                {'name': name, 'quantity': qty, 'kitchen': item['addonVariants'][name]['kitchen']}
                for name, qty in item.get('addonQuantities', {}).items()
                if qty > 0 and name in item.get('addonVariants', {}) and item['addonVariants'][name].get('kitchen') == kitchen
            ],
            'selectedCombos': [
                {
                    'name': name,
                    'price': item.get('comboPrices', {}).get(name, 0),
                    'size': item['comboVariants'][name]['size'],
                    'isSpicy': item['comboVariants'][name]['spicy'],
                    'kitchen': item['comboVariants'][name]['kitchen']
                }
                for name, qty in item.get('comboQuantities', {}).items()
                if qty > 0 and name in item.get('comboVariants', {}) and item['comboVariants'][name].get('kitchen') == kitchen
            ]
        }
        picked_up_collection.insert_one(picked_up_data)

        return jsonify({'success': True, 'status': 'PickedUp'}), 200
    except Exception as e:
        logger.error(f"Error in /api/activeorders/{order_id}/items/{item_id}/mark-pickedup: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/activeorders/<order_id>', methods=['PUT'])
def update_active_order(order_id):
    try:
        data = request.get_json()
        if '_id' in data:
            del data['_id']

        if 'deliveryPersonId' in data and data['deliveryPersonId']:
            employee = employees_collection.find_one({'employeeId': data['deliveryPersonId']}, {'_id': 0})
            if not employee:
                logger.warning(f"Delivery person not found: {data['deliveryPersonId']}")
                return jsonify({'error': 'Delivery person not found'}), 404

            order = activeorders_collection.find_one({'orderId': order_id}, {'_id': 0})
            if not order:
                logger.warning(f"Order not found: {order_id}")
                return jsonify({'error': 'Order not found'}), 404

            address = order.get('deliveryAddress', {})
            address_str = f"{address.get('flat_villa_no', '')}, {address.get('building_name', '')}, {address.get('location', '')}".strip(', ')

            items_summary = "\nItems:\n"
            for item in order.get('cartItems', []):
                items_summary += f"- {item['name']} x{item['quantity']} (Size: {item.get('selectedSize', 'M')}, Spicy: {'Yes' if item.get('isSpicy', False) else 'No'}, Kitchen: {item.get('kitchen', 'Unknown')})\n"
                if item.get('addonQuantities', {}):
                    items_summary += "  Add-ons:\n"
                    for addon_name, qty in item['addonQuantities'].items():
                        if qty > 0 and 'addonVariants' in item and addon_name in item['addonVariants']:
                            addon = item['addonVariants'][addon_name]
                            items_summary += f"    + {addon_name} x{qty} (Kitchen: {addon.get('kitchen', 'Unknown')})\n"
                if item.get('comboQuantities', {}):
                    items_summary += "  Combos:\n"
                    for combo_name, qty in item['comboQuantities'].items():
                        if qty > 0 and 'comboVariants' in item and combo_name in item['comboVariants']:
                            combo = item['comboVariants'][combo_name]
                            items_summary += f"    + {combo_name} x{qty} (Size: {combo.get('size', 'M')}, Spicy: {'Yes' if combo.get('spicy', False) else 'No'}, Kitchen: {combo.get('kitchen', 'Unknown')})\n"

            pickup_url = f"http://localhost:5000/api/activeorders/{order_id}/pickedup"
            sms_body = (
                f"New delivery assigned to you!\n"
                f"Order ID: {order_id}\n"
                f"Customer: {order.get('customerName', 'N/A')}\n"
                f"Address: {address_str or 'Not provided'}\n"
                f"Phone: {order.get('phoneNumber', 'Not provided')}\n"
                f"{items_summary}"
                f"Mark as Picked Up: {pickup_url}"
            )
            message = twilio_client.messages.create(
                body=sms_body,
                from_=twilio_phone,
                to=employee['phoneNumber']
            )
            logger.info(f"SMS sent to {employee['phoneNumber']}: {message.sid}")

            # Store trip report data
            trip_report = {
                'tripId': generate_unique_id(),
                'deliveryPersonId': data['deliveryPersonId'],
                'orderId': order_id,
                'customerName': order.get('customerName', 'N/A'),
                'phoneNumber': order.get('phoneNumber', ''),
                'deliveryAddress': order.get('deliveryAddress', {}),
                'cartItems': order.get('cartItems', []),
                'timestamp': order.get('timestamp', datetime.utcnow().isoformat()),
                'orderType': order.get('orderType', 'Online Delivery'),
                'status': order.get('status', 'Pending'),
                'pickedUpTime': order.get('pickedUpTime', None),
                'created_at': datetime.utcnow()
            }
            tripreports_collection.insert_one(trip_report)
            logger.info(f"Created trip report for order: {order_id}, delivery person: {data['deliveryPersonId']}")

        result = activeorders_collection.update_one(
            {'orderId': order_id},
            {'$set': data}
        )
        updated_order = activeorders_collection.find_one({'orderId': order_id}, {'_id': 0})
        if result.modified_count > 0:
            logger.info(f"Updated order: {order_id}")
            return jsonify({'success': True, 'message': 'Order updated', 'order': updated_order}), 200
        logger.info(f"No changes made to order: {order_id}")
        return jsonify({'error': 'Order not found or no changes made'}), 404
    except TwilioRestException as e:
        logger.error(f"Twilio error: {str(e)}")
        return jsonify({'error': f'Failed to send SMS: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Error updating active order: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/activeorders/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    try:
        result = activeorders_collection.delete_one({'orderId': order_id})
        if result.deleted_count > 0:
            logger.info(f"Deleted order: {order_id}")
            return jsonify({'success': True}), 200
        logger.warning(f"Order not found: {order_id}")
        return jsonify({'error': 'Order not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting order: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/activeorders/<order_id>/pickedup', methods=['POST'])
def mark_order_pickedup(order_id):
    try:
        order = activeorders_collection.find_one({'orderId': order_id}, {'_id': 0})
        if not order:
            logger.warning(f"Order not found: {order_id}")
            return jsonify({'error': 'Order not found'}), 404

        pickup_time = datetime.utcnow().isoformat()
        result = activeorders_collection.update_one(
            {'orderId': order_id},
            {
                '$set': {
                    'status': 'PickedUp',
                    'pickedUpTime': pickup_time
                }
            }
        )

        # Update trip report status
        tripreports_collection.update_many(
            {'orderId': order_id},
            {
                '$set': {
                    'status': 'PickedUp',
                    'pickedUpTime': pickup_time
                }
            }
        )

        updated_order = activeorders_collection.find_one({'orderId': order_id}, {'_id': 0})
        if result.modified_count > 0:
            logger.info(f"Order marked as picked up: {order_id} at {pickup_time}")
            return jsonify({'success': True, 'message': 'Order marked as picked up', 'order': updated_order}), 200
        logger.info(f"No changes made to order: {order_id}")
        return jsonify({'error': 'Order not found or no changes made'}), 404
    except Exception as e:
        logger.error(f"Error marking order as picked up: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/tripreports/<employee_id>', methods=['GET'])
def get_trip_reports(employee_id):
    try:
        trip_reports = list(tripreports_collection.find({'deliveryPersonId': employee_id}, {'_id': 0}))
        logger.info(f"Fetched {len(trip_reports)} trip reports for employee: {employee_id}")
        return jsonify(trip_reports), 200
    except Exception as e:
        logger.error(f"Error fetching trip reports: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the React frontend from the dist folder."""
    if path != "" and os.path.exists(os.path.join(STATIC_DIR, path)):
        return send_from_directory(STATIC_DIR, path)
    if os.path.exists(os.path.join(STATIC_DIR, 'index.html')):
        return send_from_directory(STATIC_DIR, 'index.html')
    logger.warning(f"Frontend file not found: {path}")
    return jsonify({"error": "Frontend not found"}), 404

# Start the server
if __name__ == '__main__':
    start_scheduler()  # Start the backup scheduler
    # Use waitress for production, Flask's built-in server for development
    if getattr(sys, 'frozen', False):
        logger.info("Running as frozen executable, using waitress")
        waitress.serve(app, host='0.0.0.0', port=5000)
    else:
        logger.info("Running in development mode, using Flask")
        app.run(host='0.0.0.0', port=5000, debug=True)