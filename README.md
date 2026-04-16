# 🔐 Secure VPN Simulation using Python

> An interactive simulation of a Virtual Private Network (VPN) system demonstrating secure communication over an insecure network, complete with a **stunning web-based UI** for visualization and demonstration.

![Hero Section](screenshots/01_hero.png)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technologies Used](#-technologies-used)
- [System Architecture](#-system-architecture)
- [Security Principles (CIA Triad)](#-security-principles---the-cia-triad)
- [How It Works — Step by Step](#-how-it-works--step-by-step)
- [Screenshots](#-screenshots)
- [Installation & Setup](#-installation--setup)
- [Running the Project](#-running-the-project)
- [Web UI Demonstration Guide](#-web-ui-demonstration-guide)
- [Code Structure](#-code-structure)
- [Testing](#-testing)
- [Limitations](#-limitations)
- [Future Improvements](#-future-improvements)

---

## 🌐 Overview

This project implements a **simulated Virtual Private Network (VPN)** system using Python to demonstrate secure communication over an insecure network. It is built using a **client-server architecture** and incorporates key network security principles such as:

- **Encryption** (AES via Fernet)
- **Authentication** (Username/Password)
- **Integrity Verification** (SHA-256 Hashing)
- **Multi-Client Support** (Threading)

The project includes a **fully interactive web-based UI** that lets you demonstrate and visualize the entire VPN communication flow — including key exchange, encryption, hashing, transmission, decryption, and integrity verification — without touching the terminal.

---

## ✨ Features

| Feature | Description |
|:--------|:------------|
| 🔐 **AES Encryption** | All messages encrypted using Fernet (AES-128-CBC with HMAC-SHA256) |
| 🧬 **SHA-256 Hashing** | Every message includes a hash for integrity verification |
| 👤 **User Authentication** | Login with username & password, credentials sent encrypted |
| 🔑 **Dynamic Key Exchange** | Server generates and shares unique encryption key per session |
| 🧵 **Multi-Client Support** | Server handles multiple clients simultaneously via threading |
| 📋 **Communication Logging** | All verified messages are logged to `log.txt` |
| 💀 **Tamper Detection** | System detects and flags any modified data |
| 🌐 **Interactive Web UI** | Beautiful demo website to visualize the entire process |

---

## 🛠️ Technologies Used

| Technology | Purpose |
|:-----------|:--------|
| **Python 3.x** | Core programming language |
| **socket** | TCP network communication |
| **cryptography (Fernet)** | AES-based symmetric encryption |
| **hashlib** | SHA-256 hashing for integrity |
| **threading** | Multi-client concurrent handling |
| **HTML/CSS/JavaScript** | Interactive web-based demo UI |

---

## 🏗️ System Architecture

The system follows a **modular architecture** with clear separation of concerns:

![Architecture](screenshots/03_architecture.png)

### Module Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│                                                             │
│   ┌───────────────────┐     ┌───────────────────────┐       │
│   │    client.py       │     │      server.py        │       │
│   │                    │     │                       │       │
│   │ • Connect via TCP  │     │ • Listen on port 5000 │       │
│   │ • Receive key      │     │ • Generate & share key│       │
│   │ • Send encrypted   │     │ • Validate credentials│       │
│   │   auth credentials │     │ • Verify message hash │       │
│   │ • Send hashed msgs │     │ • Multi-threaded      │       │
│   └────────┬──────────┘     └────────┬──────────────┘       │
│            │                         │                       │
│            │      ↓ imports          │     ↓ imports         │
│            │                         │                       │
│   ┌────────┴──────────┐     ┌────────┴──────────────┐       │
│   │  encryption.py     │     │    security.py        │       │
│   │                    │     │                       │       │
│   │ • generate_key()   │     │ • generate_hash(msg)  │       │
│   │ • get_cipher(key)  │     │ • verify_hash(msg, h) │       │
│   │ • encrypt_message()│     │                       │       │
│   │ • decrypt_message()│     │                       │       │
│   └────────────────────┘     └───────────────────────┘       │
│                                                              │
│                   CRYPTOGRAPHY LAYER                         │
└──────────────────────────────────────────────────────────────┘
```

**File Descriptions:**

| File | Role |
|:-----|:-----|
| `server.py` | TCP server — generates keys, authenticates users, receives/decrypts messages, verifies integrity |
| `client.py` | TCP client — connects to server, authenticates, encrypts & hashes messages before sending |
| `encryption.py` | Utility module — Fernet key generation, cipher creation, encrypt/decrypt functions |
| `security.py` | Utility module — SHA-256 hash generation and verification |
| `log.txt` | Auto-generated log of all valid communications |
| `index.html` | Interactive web-based demonstration UI |
| `style.css` | Styling for the web UI |
| `script.js` | Interactive logic for the web demo |

---

## 🛡️ Security Principles — The CIA Triad

This project implements all three pillars of the **CIA Triad**:

![CIA Triad](screenshots/04_cia_triad.png)

### 1. Confidentiality — AES Encryption (Fernet)

**What:** Data is accessible only to authorized parties.

**How:** All messages are encrypted using **Fernet (AES-128-CBC)** before transmission. Even if an attacker intercepts the data on the network, they cannot read it without the encryption key.

```
Encryption Flow:
  plaintext → PKCS7 padding → AES-128-CBC encrypt → HMAC-SHA256 sign → Base64 encode

Decryption Flow:
  Base64 decode → HMAC verify → AES-128-CBC decrypt → PKCS7 unpad → plaintext
```

**Code (`encryption.py`):**
```python
from cryptography.fernet import Fernet

def generate_key():
    return Fernet.generate_key()

def get_cipher(key):
    return Fernet(key)

def encrypt_message(cipher, message):
    return cipher.encrypt(message.encode())

def decrypt_message(cipher, encrypted_message):
    return cipher.decrypt(encrypted_message).decode()
```

---

### 2. Integrity — SHA-256 Hashing

**What:** Data has not been altered during transit.

**How:** The client computes a **SHA-256 hash** of each message and sends it along with the encrypted message. The server recalculates the hash after decryption and compares it with the received hash. If they don't match, the data has been tampered with.

```
Client:  hash = SHA-256("Hello")  →  "185f8db32271..."
         sends: encrypt("Hello||185f8db32271...")

Server:  decrypt → split("Hello", "185f8db32271...")
         recalculate = SHA-256("Hello") → "185f8db32271..."
         compare: recalculate == received_hash ? ✅ Valid : ❌ Tampered
```

**Key SHA-256 Properties:**
- **Deterministic** — same input → same hash
- **Irreversible** — cannot recover original message from hash
- **Avalanche Effect** — tiny input change → completely different hash
- **Collision Resistant** — near-impossible to find two inputs with same hash

**Code (`security.py`):**
```python
import hashlib

def generate_hash(message):
    return hashlib.sha256(message.encode()).hexdigest()

def verify_hash(message, received_hash):
    calculated_hash = hashlib.sha256(message.encode()).hexdigest()
    return calculated_hash == received_hash
```

---

### 3. Availability — Multi-Threaded Server

**What:** The system remains accessible to authorized users at all times.

**How:** The server uses Python's **threading** module to handle each client connection in a separate thread. This ensures one slow or unresponsive client does not block other clients.

```
Main Thread:  while True → accept() → spawn new thread
Thread 1:     handle_client(client_1)  ← runs independently
Thread 2:     handle_client(client_2)  ← runs independently
Thread N:     handle_client(client_N)  ← runs independently
```

---

## 🔄 How It Works — Step by Step

![Workflow](screenshots/06_workflow.png)

### Complete Communication Flow:

| Step | Action | Detail |
|:----:|:-------|:-------|
| **1** | 🔌 **TCP Connection** | Client creates a socket and connects to server at `127.0.0.1:5000`. Server accepts and spawns a new thread. |
| **2** | 🔑 **Key Exchange** | Server generates a Fernet key via `Fernet.generate_key()` and sends it to the client over the socket. |
| **3** | 👤 **Authentication** | Client encrypts `username:password` with the shared key and sends it. Server decrypts and validates against its user database. |
| **4** | 📝 **Message Preparation** | Client computes SHA-256 hash of the message, combines as `message||hash`, then encrypts the entire combined string. |
| **5** | 📡 **Encrypted Transmission** | The encrypted payload is sent over the TCP socket. Intercepted data appears as unintelligible ciphertext. |
| **6** | ✅ **Decrypt & Verify** | Server decrypts the data, splits message and hash, recalculates SHA-256, and compares. Match = valid, mismatch = tampered! |

### Message Preparation Detail (Step 4):
```
1. message = "Hello"
2. hash = SHA256("Hello") → "185f8db32271fe25f561a6fc938b2e26..."
3. combined = "Hello||185f8db32271fe25f561a6fc938b2e26..."
4. encrypted = Fernet.encrypt(combined) → "gAAAAABp4G47KREg3C26..."
```

### Server Verification Detail (Step 6):
```
1. decrypted = Fernet.decrypt(data) → "Hello||185f8db32271..."
2. message, received_hash = split("||")
3. calculated_hash = SHA256("Hello") → "185f8db32271..."
4. calculated_hash == received_hash → ✅ Message Valid
```

---

## 📸 Screenshots

### Landing Page
![Hero Section](screenshots/01_hero.png)

### Feature Overview
![Overview](screenshots/02_overview.png)

### System Architecture
![Architecture](screenshots/03_architecture.png)

### CIA Triad & Theory
![CIA Triad](screenshots/04_cia_triad.png)

![Theory Details](screenshots/05_theory.png)

### Communication Workflow
![Workflow](screenshots/06_workflow.png)

### Interactive Demo — Initial State
![Demo Initial](screenshots/07_demo_initial.png)

### Interactive Demo — Connected & Authenticated
![Demo Connected](screenshots/08_demo_connected.png)

### Interactive Demo — Secure Message Sent ✅
![Demo Secure Send](screenshots/09_demo_secure.png)

### Interactive Demo — Tampered Message Detected ❌
![Demo Tampered](screenshots/10_demo_tampered.png)

### Interactive Demo — Server Tamper Detection
![Demo Tamper Server](screenshots/11_demo_tamper_server.png)

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.x installed
- `pip` package manager

### Install Dependencies
```bash
pip install cryptography
```

### Clone the Repository
```bash
git clone https://github.com/GL-Anugnya/VPN-Simulation-python.git
cd VPN-Simulation-python
```

---

## 🚀 Running the Project

### Option 1: Run the Terminal-Based VPN

**Terminal 1 — Start the Server:**
```bash
python server.py
```
Output:
```
VPN Server running...
Waiting for connections...
```

**Terminal 2 — Start the Client:**
```bash
python client.py
```

**Login with valid credentials:**
```
Enter username: admin
Enter password: 1234
```

**Send messages:**
```
Enter message: Hello from VPN!
```

Type `exit` to disconnect.

**Valid Credentials:**
| Username | Password |
|:---------|:---------|
| `admin` | `1234` |
| `user` | `pass` |

---

### Option 2: Run the Interactive Web Demo

```bash
python -m http.server 8080
```

Open your browser and navigate to: **http://localhost:8080**

---

## 🎮 Web UI Demonstration Guide

The web UI allows you to demonstrate the **entire VPN simulation visually** without needing to show the codebase. Here's a step-by-step guide to give a complete demo:

### 🎬 Step 1: Introduction (Hero Section)
- Open the website and show the **landing page**
- Point out the **animated Client ↔ Server tunnel** with data packets flowing between them
- Mention the **tech stack pills**: Python 3, Socket Programming, Cryptography, Threading, SHA-256

### 🎬 Step 2: Feature Overview
- Scroll to the **Project Overview** section
- Briefly explain each of the 6 feature cards:
  - 🔐 AES Encryption
  - 🧬 SHA-256 Hashing
  - 👤 Authentication
  - 🔑 Key Exchange
  - 🧵 Multi-Client Support
  - 📋 Logging

### 🎬 Step 3: Architecture
- Scroll to the **Architecture** section
- Walk through the 4 modules: `client.py`, `server.py`, `encryption.py`, `security.py`
- Explain how the application layer imports from the cryptography layer

### 🎬 Step 4: Theory & CIA Triad
- Scroll to the **Theory** section
- Explain the **CIA Triad** using the 3 visual cards:
  - **C** (Confidentiality) → AES Encryption
  - **I** (Integrity) → SHA-256 Hashing
  - **A** (Availability) → Multi-Threading
- Scroll through the detailed theory cards explaining VPN, AES, SHA-256, Sockets, and Threading

### 🎬 Step 5: Communication Workflow
- Scroll to the **Workflow** section
- Walk through the **6-step timeline**:
  1. TCP Connection → 2. Key Exchange → 3. Authentication → 4. Message Hash & Encrypt → 5. Encrypted Transmission → 6. Decrypt & Verify

### 🎬 Step 6: Live Demo — Connection & Authentication
- Scroll to the **Interactive VPN Demo** section
- Show the **Client Terminal** (left) and **Server Terminal** (right) panels
- Point out both show "Disconnected" / "Listening" status
- Enter credentials: **Username: `admin`**, **Password: `1234`**
- Click **🔌 Connect & Authenticate**
- Watch the animation and explain each step as it appears:
  - Server generates and sends encryption key
  - Client encrypts credentials with the key
  - **Intercepted Data** panel in the middle shows the encrypted ciphertext — explain this is what an attacker would see
  - Server decrypts and validates → Status changes to ✅ "Connected"

### 🎬 Step 7: Live Demo — Secure Message
- Type a message (e.g., "Hello from VPN!")
- Click **📤 Send Secure**
- Walk through what happens:
  - Client computes **SHA-256 hash** of the message
  - Combines message + hash
  - **Encrypts** the combined string
  - Shows the encrypted data being transmitted
  - Server **decrypts**, splits message and hash
  - Server **recalculates** SHA-256 and compares
  - ✅ **"Integrity verified! Message valid"** appears
- Scroll down to the **🔬 Process Visualization** panel — each step is shown with icons and detailed values

### 🎬 Step 8: Live Demo — Tamper Detection (Key Highlight!)
- Click **💀 Send Tampered**
- Explain: *"This simulates what happens if an attacker modifies the message in transit"*
- Walk through:
  - A **fake hash** (`000000...`) is used instead of the real SHA-256
  - The message is still encrypted and transmitted
  - Server decrypts and recalculates the real hash
  - ❌ **"DATA TAMPERED! Hash mismatch detected!"** appears in red
  - The Process Visualization shows the expected vs received hash
- **Key Point:** *"Even though the attacker can't read the message (encryption), the server detects the modification (hashing)"*

### 🎬 Step 9: Reset & Repeat
- Click **🔄 Reset Demo** to start fresh
- Try with **wrong credentials** (e.g., username: `hacker`, password: `wrong`) to show failed authentication
- Try with the other valid user: **username: `user`**, **password: `pass`**

### 💡 Key Points to Emphasize During Demo

1. **Intercepted Data Panel** — Show that even network spies only see encrypted gibberish
2. **Send Secure vs Send Tampered** — The contrast between ✅ valid and ❌ tampered is the most impactful moment
3. **Process Visualization** — Use it to walk through the crypto pipeline step by step
4. **CIA Triad** — Connect each demo action back to Confidentiality, Integrity, and Availability

---

## 📁 Code Structure

```
VPN-Simulation-python/
│
├── server.py          # VPN Server — listens, authenticates, decrypts, verifies
├── client.py          # VPN Client — connects, encrypts, hashes, sends
├── encryption.py      # Encryption utilities (Fernet/AES)
├── security.py        # Hashing utilities (SHA-256)
├── log.txt            # Communication log (auto-generated)
│
├── index.html         # Interactive web demo (main page)
├── style.css          # Web UI styling (dark theme)
├── script.js          # Web UI interactive logic
│
├── screenshots/       # Documentation screenshots
│   ├── 01_hero.png
│   ├── 02_overview.png
│   ├── 03_architecture.png
│   ├── 04_cia_triad.png
│   ├── 05_theory.png
│   ├── 06_workflow.png
│   ├── 07_demo_initial.png
│   ├── 08_demo_connected.png
│   ├── 09_demo_secure.png
│   ├── 10_demo_tampered.png
│   └── 11_demo_tamper_server.png
│
├── diagrams/          # System design diagrams (XML)
└── README.md          # This file
```

---

## 🧪 Testing

The system was tested for the following scenarios:

| Test Case | Expected Result | Status |
|:----------|:----------------|:------:|
| Valid login (`admin`/`1234`) | Authentication success | ✅ |
| Valid login (`user`/`pass`) | Authentication success | ✅ |
| Invalid login | Authentication failure, connection closed | ✅ |
| Secure message transmission | Message encrypted, hash verified, logged | ✅ |
| Tampered message detection | Hash mismatch detected, message rejected | ✅ |
| Multiple simultaneous clients | All clients handled independently | ✅ |
| Network interception simulation | Only encrypted ciphertext visible | ✅ |

---

## ⚠️ Limitations

- This is a **simulation** and not a production-ready VPN
- No real tunneling protocols (IPSec/OpenVPN/WireGuard)
- Runs on **localhost** only (127.0.0.1)
- Key exchange happens in plaintext (no Diffie-Hellman or TLS handshake)
- No persistent session management
- Single-server architecture (no redundancy)

---

## 🚧 Future Improvements

- [ ] Implement real VPN tunneling protocols (IPSec/WireGuard)
- [ ] Add TLS/SSL for secure key exchange
- [ ] Implement Diffie-Hellman key exchange
- [ ] Build a graphical desktop UI (Tkinter/PyQt)
- [ ] Add multi-factor authentication (MFA)
- [ ] Deploy over a real network (not just localhost)
- [ ] Add RSA asymmetric encryption for key exchange
- [ ] Implement session timeout and management
- [ ] Add rate limiting and brute-force protection

---

## 📄 License

This project is for **educational purposes** — a Network Security course project demonstrating cryptographic communication principles.

---

<p align="center">
  <strong>🔐 Secure VPN Simulation</strong><br>
  Built with Python • Sockets • Fernet/AES • SHA-256 • Threading
</p>
