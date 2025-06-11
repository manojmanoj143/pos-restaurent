# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['app.py'],  # Entry point of your Flask application
    pathex=['C:\\manoj\\pos'],  # Updated path to your project directory
    binaries=[],
    datas=[
        ('C:\\manoj\\pos\\static\\uploads', 'static/uploads'),  # Include uploads folder
        ('C:\\manoj\\pos\\static', 'static'),  # Include static folder (CSS, JS, etc.)
        ('C:\\manoj\\pos\\.env', '.'),  # Include .env file for environment variables
    ],
    hiddenimports=[
        'flask', 'flask_cors', 'pymongo', 'pymongo.collection', 'pymongo.errors',
        'tenacity', 'bson', 'werkzeug', 'werkzeug.utils', 'werkzeug.serving',
        'jinja2', 'markupsafe', 'itsdangerous', 'openpyxl', 'schedule',
        'waitress', 'smtplib', 'email.mime.text', 'email.mime.multipart',
        'email.mime.base', 'email.encoders', 'threading', 'logging.handlers',
        'datetime', 'os', 'sys', '_cffi_backend'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'wx', 'matplotlib', 'numpy'],  # Exclude unnecessary modules
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='flask_server',  # Name of the executable
    debug=False,  # Set to True for debugging issues
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPX compression disabled
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False for no console window (GUI mode)
    disable_windowed_traceback=False,
    target_arch='x64',  # Target 64-bit architecture
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='flask_server_dist'  # Output directory name
)