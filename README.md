# Secure VPN Simulation using Python

## Overview
This project implements a simulated Virtual Private Network (VPN) system to demonstrate secure communication over an insecure network. The system is built using a client-server architecture and incorporates key network security principles such as encryption, authentication, integrity verification, and multi-client support.

The aim of this project is to provide a simplified understanding of how VPNs ensure secure data transmission using cryptographic techniques.

## Features
- Secure communication using AES-based encryption (Fernet)
- User authentication using username and password
- Data integrity verification using SHA-256 hashing
- Dynamic key exchange between client and server
- Multi-client support using threading
- Logging of communication for monitoring
- Detection of tampered data

## Technologies Used
- Python 3.x
- socket (network communication)
- cryptography (encryption)
- hashlib (hashing)
- threading (multi-client handling)

## Project Structure
vpn_project/
│
├── client.py
├── server.py
├── encryption.py
├── security.py
└── log.txt

## How It Works
1. The client connects to the server using TCP sockets.
2. The server generates and shares an encryption key.
3. The client authenticates using username and password.
4. Messages are encrypted and hashed before transmission.
5. The server decrypts the message and verifies its integrity.
6. If the hash matches, the message is accepted; otherwise, it is flagged as tampered.
7. The server handles multiple clients simultaneously using threading.

## Installation
Install required dependency:
pip install cryptography

## Usage
Step 1: Start the server  
python server.py  

Step 2: Start the client  
python client.py  

Step 3: Login using valid credentials  
Username: admin  
Password: 1234  

Step 4: Send messages  
Messages will be encrypted before transmission and verified at the server.

## Testing
The system was tested for:
- Successful and failed authentication
- Secure message transmission
- Integrity verification using hashing
- Tampered message detection
- Multi-client communication

## Security Implementation
The system implements the CIA triad:
- Confidentiality using AES-based encryption
- Integrity using SHA-256 hashing
- Availability using multi-client threaded server

Additional mechanisms include authentication, key exchange, and logging.

## Limitations
- This is a simulation and not a full VPN implementation
- No real tunneling protocols (IPSec/OpenVPN)
- Runs on localhost

## Future Improvements
- Implement real VPN protocols
- Add graphical user interface
- Use TLS for secure communication
- Implement multi-factor authentication
- Deploy over a real network
