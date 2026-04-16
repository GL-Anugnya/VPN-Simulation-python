/* ============================================
   SECURE VPN SIMULATION — INTERACTIVE LOGIC
   ============================================ */

// ========== PARTICLES BACKGROUND ==========
(function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 60;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.3 + 0.05;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79, 140, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    function connectParticles() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                const dx = particles[a].x - particles[b].x;
                const dy = particles[a].y - particles[b].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(79, 140, 255, ${0.05 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        connectParticles();
        requestAnimationFrame(animate);
    }

    animate();
})();


// ========== NAVBAR SCROLL EFFECT ==========
(function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
    });

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
})();


// ========== SCROLL REVEAL ANIMATION ==========
(function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.overview-card, .cia-card, .theory-card, .wf-step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
})();


// ========== INTERACTIVE VPN DEMO ==========
(function initDemo() {

    // --- HELPERS ---
    function simulateFernetKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=';
        let key = '';
        for (let i = 0; i < 44; i++) key += chars[Math.floor(Math.random() * chars.length)];
        return key;
    }

    function simulateEncrypt(text) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=';
        let enc = 'gAAAAAB';
        for (let i = 0; i < 60 + Math.floor(Math.random() * 40); i++) enc += chars[Math.floor(Math.random() * chars.length)];
        return enc;
    }

    function simulateSHA256(message) {
        // Simple hash simulation (not real SHA256, but deterministic-looking)
        let hash = '';
        const hexChars = '0123456789abcdef';
        let seed = 0;
        for (let i = 0; i < message.length; i++) seed += message.charCodeAt(i) * (i + 1);
        for (let i = 0; i < 64; i++) {
            seed = (seed * 31 + i * 7 + 13) & 0xFFFFFFFF;
            hash += hexChars[Math.abs(seed) % 16];
        }
        return hash;
    }

    function fakeSHA256() {
        return '0'.repeat(64);
    }

    // --- DOM REFS ---
    const clientTerminal = document.getElementById('clientTerminal');
    const serverTerminal = document.getElementById('serverTerminal');
    const clientStatus = document.getElementById('clientStatus');
    const serverStatus = document.getElementById('serverStatus');
    const authForm = document.getElementById('authForm');
    const msgForm = document.getElementById('msgForm');
    const btnConnect = document.getElementById('btnConnect');
    const btnSend = document.getElementById('btnSend');
    const btnTamper = document.getElementById('btnTamper');
    const btnReset = document.getElementById('btnReset');
    const networkPacket = document.getElementById('networkPacket');
    const interceptedBody = document.getElementById('interceptedBody');
    const vizSteps = document.getElementById('vizSteps');

    const VALID_USERS = { 'admin': '1234', 'user': 'pass' };
    let currentKey = '';
    let isConnected = false;

    // --- TERMINAL HELPERS ---
    function addLine(terminal, html, className) {
        const line = document.createElement('div');
        line.className = 'term-line';
        if (className) line.classList.add(className);
        line.innerHTML = html;
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    }

    function addClientLine(html, cls) { addLine(clientTerminal, `<span class="term-prompt">$</span> ${html}`, cls); }
    function addServerLine(html, cls) { addLine(serverTerminal, `<span class="term-prompt">$</span> ${html}`, cls); }

    function clearViz() {
        vizSteps.innerHTML = '';
    }

    function addVizStep(icon, color, title, detail, delay) {
        const step = document.createElement('div');
        step.className = 'viz-step';
        step.style.animationDelay = `${delay}ms`;
        step.innerHTML = `
            <div class="viz-step-icon ${color}">${icon}</div>
            <div class="viz-step-content">
                <div class="viz-step-title">${title}</div>
                <div class="viz-step-detail">${detail}</div>
            </div>
        `;
        vizSteps.appendChild(step);
    }

    function animatePacket(direction) {
        networkPacket.className = 'dn-packet';
        void networkPacket.offsetWidth; // reflow
        networkPacket.classList.add(direction === 'down' ? 'animate-down' : 'animate-up');
    }

    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // --- CONNECT & AUTH ---
    btnConnect.addEventListener('click', async () => {
        const username = document.getElementById('demoUsername').value.trim();
        const password = document.getElementById('demoPassword').value.trim();

        if (!username || !password) return;

        btnConnect.disabled = true;
        clearViz();

        // Step 1: TCP Connection
        addClientLine('<span class="term-info">Connecting to 127.0.0.1:5000...</span>');
        await sleep(600);
        addServerLine('<span class="term-success">[+] Connection from 127.0.0.1</span>');
        addVizStep('🔌', 'blue', 'TCP Connection Established', 'Client connected to server at <strong>127.0.0.1:5000</strong> via TCP socket.', 0);

        // Step 2: Key Exchange
        await sleep(500);
        currentKey = simulateFernetKey();
        addServerLine(`<span class="term-info">[KEY] Generated: </span><span class="term-dim">${currentKey}</span>`);
        animatePacket('up');
        await sleep(800);
        addClientLine(`<span class="term-info">[KEY] Received: </span><span class="term-dim">${currentKey.substring(0, 20)}...</span>`);
        addVizStep('🔑', 'purple', 'Encryption Key Exchange', `Server generated Fernet key and sent to client.<br><strong>Key:</strong> ${currentKey.substring(0, 30)}...`, 100);

        // Step 3: Authentication
        await sleep(500);
        const authPlain = `${username}:${password}`;
        const authEncrypted = simulateEncrypt(authPlain);
        addClientLine(`<span class="term-accent">[AUTH] Plaintext: </span><span class="term-dim">${authPlain}</span>`);
        addClientLine(`<span class="term-accent">[AUTH] Encrypted: </span><span class="term-dim">${authEncrypted.substring(0, 40)}...</span>`);
        addVizStep('🔒', 'cyan', 'Credentials Encrypted', `<strong>Plaintext:</strong> ${authPlain}<br><strong>Ciphertext:</strong> ${authEncrypted.substring(0, 50)}...`, 200);

        animatePacket('down');
        interceptedBody.textContent = authEncrypted;
        await sleep(800);

        addServerLine(`<span class="term-accent">[AUTH] Received encrypted credentials</span>`);
        addServerLine(`<span class="term-accent">[AUTH] Decrypted: </span><span class="term-dim">${authPlain}</span>`);

        // Check auth
        await sleep(400);
        if (VALID_USERS[username] && VALID_USERS[username] === password) {
            addServerLine(`<span class="term-success">[AUTH SUCCESS] ${username} authenticated ✅</span>`);
            animatePacket('up');
            await sleep(600);
            addClientLine(`<span class="term-success">[AUTH] Authentication Successful! ✅</span>`);
            addVizStep('✅', 'green', 'Authentication Successful', `User <strong>${username}</strong> authenticated successfully. Server validated credentials against user database.`, 300);

            clientStatus.textContent = 'Connected';
            clientStatus.classList.add('connected');
            serverStatus.textContent = 'Active Client';
            serverStatus.classList.add('connected');
            isConnected = true;

            authForm.classList.add('dp-hidden');
            msgForm.classList.remove('dp-hidden');
        } else {
            addServerLine(`<span class="term-error">[AUTH FAILED] Invalid credentials for "${username}" ❌</span>`);
            animatePacket('up');
            await sleep(600);
            addClientLine(`<span class="term-error">[AUTH] Authentication Failed! ❌</span>`);
            addVizStep('❌', 'red', 'Authentication Failed', `Invalid credentials for user <strong>${username}</strong>. Connection closed by server.`, 300);
            btnConnect.disabled = false;
        }
    });

    // --- SEND MESSAGE ---
    async function sendMessage(tampered) {
        if (!isConnected) return;

        const message = document.getElementById('demoMessage').value.trim();
        if (!message) return;

        btnSend.disabled = true;
        btnTamper.disabled = true;
        clearViz();

        const hash = tampered ? fakeSHA256() : simulateSHA256(message);
        const realHash = simulateSHA256(message);
        const combined = `${message}||${hash}`;
        const encrypted = simulateEncrypt(combined);

        // Client side
        addClientLine(`<span class="term-info">[MSG] Plaintext: </span><span class="term-dim">"${message}"</span>`);

        addVizStep('📝', 'blue', 'Original Message', `<strong>Plaintext:</strong> "${message}"`, 0);

        await sleep(400);

        if (tampered) {
            addClientLine(`<span class="term-warn">[HASH] ⚠️ Using FAKE hash: </span><span class="term-dim">${hash.substring(0, 30)}...</span>`);
            addVizStep('💀', 'red', 'Tampered Hash Generated', `<strong>Fake hash used instead of real SHA-256!</strong><br><strong>Fake:</strong> ${hash.substring(0, 40)}...<br><strong>Real would be:</strong> ${realHash.substring(0, 40)}...`, 100);
        } else {
            addClientLine(`<span class="term-purple">[HASH] SHA-256: </span><span class="term-dim">${hash.substring(0, 30)}...</span>`);
            addVizStep('🧬', 'purple', 'SHA-256 Hash Computed', `<strong>Hash:</strong> ${hash.substring(0, 50)}...`, 100);
        }

        await sleep(400);
        addClientLine(`<span class="term-accent">[COMBINED] </span><span class="term-dim">${combined.substring(0, 50)}...</span>`);
        addVizStep('📎', 'cyan', 'Message + Hash Combined', `<strong>Combined:</strong> ${combined.substring(0, 60)}...`, 200);

        await sleep(400);
        addClientLine(`<span class="term-accent">[ENCRYPTED] </span><span class="term-dim">${encrypted.substring(0, 40)}...</span>`);
        addVizStep('🔒', 'blue', 'Fernet Encryption Applied', `<strong>Ciphertext:</strong> ${encrypted.substring(0, 60)}...`, 300);

        // Transmit
        await sleep(300);
        animatePacket('down');
        interceptedBody.textContent = encrypted;
        addClientLine(`<span class="term-info">[SEND] → Transmitting over network...</span>`);
        addVizStep('📡', 'orange', 'Data Transmitted Over Network', `Encrypted payload sent via TCP socket. An interceptor would only see: <strong>${encrypted.substring(0, 40)}...</strong>`, 400);

        await sleep(800);

        // Server side
        addServerLine(`<span class="term-info">[RECV] Encrypted data received</span>`);
        addServerLine(`<span class="term-dim">[INTERCEPTED]: ${encrypted.substring(0, 50)}...</span>`);

        await sleep(400);
        addServerLine(`<span class="term-accent">[DECRYPT] ${combined.substring(0, 50)}...</span>`);
        addVizStep('🔓', 'purple', 'Server Decrypts Data', `<strong>Decrypted:</strong> ${combined.substring(0, 60)}...`, 500);

        await sleep(400);
        addServerLine(`<span class="term-accent">[SPLIT] message = "${message}" | hash = "${hash.substring(0, 20)}..."</span>`);

        // Integrity check
        await sleep(400);
        const serverCalcHash = realHash;
        addServerLine(`<span class="term-purple">[VERIFY] Recalculated SHA-256: ${serverCalcHash.substring(0, 20)}...</span>`);
        addServerLine(`<span class="term-purple">[VERIFY] Received hash:       ${hash.substring(0, 20)}...</span>`);

        await sleep(400);
        if (!tampered) {
            addServerLine(`<span class="term-success">[VALID] ✅ Integrity verified! Message from admin: "${message}"</span>`);
            addServerLine(`<span class="term-dim">[LOG] Message logged to log.txt</span>`);
            addVizStep('✅', 'green', 'Integrity Verified — Message Valid', `Recalculated hash <strong>matches</strong> received hash.<br>Message accepted and logged: <strong>"${message}"</strong>`, 600);
        } else {
            addServerLine(`<span class="term-error">[WARNING] ❌ DATA TAMPERED! Hash mismatch detected!</span>`);
            addServerLine(`<span class="term-error">[WARNING] Expected: ${serverCalcHash.substring(0, 30)}...</span>`);
            addServerLine(`<span class="term-error">[WARNING] Received: ${hash.substring(0, 30)}...</span>`);
            addVizStep('❌', 'red', 'INTEGRITY FAILURE — Tampered Data Detected!', `Recalculated hash <strong>DOES NOT match</strong> received hash!<br><strong>Expected:</strong> ${serverCalcHash.substring(0, 40)}...<br><strong>Received:</strong> ${hash.substring(0, 40)}...<br>Message REJECTED!`, 600);
        }

        btnSend.disabled = false;
        btnTamper.disabled = false;
    }

    btnSend.addEventListener('click', () => sendMessage(false));
    btnTamper.addEventListener('click', () => sendMessage(true));

    // --- RESET ---
    btnReset.addEventListener('click', () => {
        clientTerminal.innerHTML = '<div class="term-line"><span class="term-prompt">$</span> Waiting to connect...</div>';
        serverTerminal.innerHTML = '<div class="term-line"><span class="term-prompt">$</span> VPN Server running on 127.0.0.1:5000</div><div class="term-line"><span class="term-prompt">$</span> Waiting for connections...</div>';

        clientStatus.textContent = 'Disconnected';
        clientStatus.classList.remove('connected');
        serverStatus.textContent = 'Listening';
        serverStatus.classList.remove('connected');

        authForm.classList.remove('dp-hidden');
        msgForm.classList.add('dp-hidden');

        interceptedBody.textContent = 'No data in transit';
        networkPacket.className = 'dn-packet';

        clearViz();
        vizSteps.innerHTML = '<div class="viz-placeholder">Run the demo above to see the step-by-step encryption, hashing, and verification process visualized here.</div>';

        isConnected = false;
        currentKey = '';
        btnConnect.disabled = false;

        document.getElementById('demoUsername').value = 'admin';
        document.getElementById('demoPassword').value = '1234';
        document.getElementById('demoMessage').value = 'Hello from VPN!';
    });

})();
