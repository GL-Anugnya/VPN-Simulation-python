"""
Flask API backend for the VPN Simulation Web UI.
Bridges the frontend to the REAL Python crypto modules (encryption.py, security.py).
All encryption, hashing, and verification is done by the actual project code.
"""

from flask import Flask, request, jsonify, send_from_directory
from encryption import generate_key, get_cipher, encrypt_message, decrypt_message
from security import generate_hash, verify_hash
import os

app = Flask(__name__, static_folder='.', static_url_path='')

# ── Active sessions (key + cipher per session) ──────────────────────────────
sessions = {}

# ── Same user database as server.py ─────────────────────────────────────────
VALID_USERS = {
    "admin": "1234",
    "user": "pass"
}


# ── Serve the frontend ──────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


# ── API: Generate encryption key (mirrors server.py key exchange) ────────
@app.route('/api/generate-key', methods=['POST'])
def api_generate_key():
    key = generate_key()                    # calls encryption.py → Fernet.generate_key()
    cipher = get_cipher(key)                # calls encryption.py → Fernet(key)
    session_id = key.decode()               # use key string as session ID
    sessions[session_id] = {
        'key': key,
        'cipher': cipher
    }
    return jsonify({
        'session_id': session_id,
        'key': key.decode()
    })


# ── API: Authenticate (mirrors server.py auth flow) ─────────────────────
@app.route('/api/authenticate', methods=['POST'])
def api_authenticate():
    data = request.json
    session_id = data.get('session_id')
    username = data.get('username', '')
    password = data.get('password', '')

    if session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 400

    cipher = sessions[session_id]['cipher']

    # ── CLIENT SIDE (what client.py does) ──
    auth_plain = f"{username}:{password}"
    auth_encrypted = encrypt_message(cipher, auth_plain)       # REAL Fernet encrypt

    # ── SERVER SIDE (what server.py does) ──
    auth_decrypted = decrypt_message(cipher, auth_encrypted)   # REAL Fernet decrypt
    parts = auth_decrypted.split(":")
    dec_username = parts[0]
    dec_password = parts[1] if len(parts) > 1 else ''

    success = dec_username in VALID_USERS and VALID_USERS[dec_username] == dec_password

    # Server response (mirrors server.py sending AUTH_SUCCESS / AUTH_FAILED)
    if success:
        response_encrypted = encrypt_message(cipher, "AUTH_SUCCESS")
        response_decrypted = decrypt_message(cipher, response_encrypted)
    else:
        response_encrypted = encrypt_message(cipher, "AUTH_FAILED")
        response_decrypted = decrypt_message(cipher, response_encrypted)

    if not success:
        # Clean up session on failed auth (like server.py closes connection)
        del sessions[session_id]

    return jsonify({
        'auth_plaintext': auth_plain,
        'auth_encrypted': auth_encrypted.decode(),         # REAL ciphertext
        'auth_decrypted': auth_decrypted,                  # REAL decrypted text
        'response_encrypted': response_encrypted.decode(), # REAL server response encrypted
        'response_decrypted': response_decrypted,          # REAL server response decrypted
        'success': success,
        'username': dec_username
    })


# ── API: Send message (mirrors the full client→server message flow) ─────
@app.route('/api/send-message', methods=['POST'])
def api_send_message():
    data = request.json
    session_id = data.get('session_id')
    message = data.get('message', '')
    tampered = data.get('tampered', False)

    if session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 400

    cipher = sessions[session_id]['cipher']

    # ── CLIENT SIDE ──

    # Step 1: Hash the message (calls security.py → hashlib.sha256)
    real_hash = generate_hash(message)

    # Step 2: Use real or fake hash
    if tampered:
        sent_hash = "0" * 64   # simulates tampered data (like client.py fake_hash line)
    else:
        sent_hash = real_hash

    # Step 3: Combine message + hash (like client.py: message + "||" + hash_value)
    combined = f"{message}||{sent_hash}"

    # Step 4: Encrypt combined string (calls encryption.py → Fernet.encrypt)
    encrypted = encrypt_message(cipher, combined)

    # ── NETWORK TRANSIT ──
    # (encrypted bytes are what an attacker would intercept)

    # ── SERVER SIDE ──

    # Step 5: Decrypt (calls encryption.py → Fernet.decrypt)
    decrypted = decrypt_message(cipher, encrypted)

    # Step 6: Split message and hash (like server.py: decrypted_data.split("||"))
    try:
        dec_message, received_hash = decrypted.split("||")
    except ValueError:
        return jsonify({'error': 'Invalid message format'}), 400

    # Step 7: Verify integrity (calls security.py → verify_hash)
    calculated_hash = generate_hash(dec_message)
    verified = verify_hash(dec_message, received_hash)

    # Step 8: Log if valid (like server.py: log_message)
    if verified:
        with open("log.txt", "a") as f:
            f.write(f"(web-demo) ({data.get('username', 'unknown')}): {dec_message}\n")

    return jsonify({
        # Client-side values
        'message': message,
        'real_hash': real_hash,             # REAL SHA-256
        'sent_hash': sent_hash,             # what was actually sent (real or fake)
        'combined': combined,
        'encrypted': encrypted.decode(),    # REAL Fernet ciphertext

        # Server-side values
        'decrypted': decrypted,             # REAL Fernet decryption
        'dec_message': dec_message,
        'received_hash': received_hash,
        'calculated_hash': calculated_hash, # REAL SHA-256 recalculation
        'verified': verified,               # REAL verify_hash() result

        'tampered': tampered
    })



# ── API: Read log.txt ────────────────────────────────────────────────────────
@app.route('/api/log', methods=['GET'])
def api_log():
    try:
        with open('log.txt', 'r') as f:
            lines = f.readlines()
        return jsonify({'lines': [l.rstrip() for l in lines if l.strip()]})
    except FileNotFoundError:
        return jsonify({'lines': ['log.txt is empty — no messages logged yet']})


# ── API: Reset / disconnect session ─────────────────────────────────────────
@app.route('/api/reset', methods=['POST'])
def api_reset():
    data = request.json or {}
    session_id = data.get('session_id', '')
    if session_id in sessions:
        del sessions[session_id]
    return jsonify({'ok': True})



if __name__ == '__main__':
    print("\n[VPN Simulation Web UI] Backend Running")
    print("  Open http://127.0.0.1:5001 in your browser\n")
    app.run(host='127.0.0.1', port=5001, debug=True)
