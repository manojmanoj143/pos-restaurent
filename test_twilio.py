import os
from twilio.rest import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Twilio credentials
account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_phone = os.getenv('TWILIO_PHONE_NUMBER')

# Initialize Twilio client
try:
    client = Client(account_sid, auth_token)
    print("Twilio client initialized successfully")
    
    # Test sending an SMS
    message = client.messages.create(
        body="Test message from Twilio",
        from_=twilio_phone,
        to="+918921083090"  # Replace with a valid phone number
    )
    print(f"Message sent: {message.sid}")
except Exception as e:
    print(f"Failed to initialize Twilio client or send message: {str(e)}")