/* ============================================
   SECURE VPN SIMULATION — INTERACTIVE TERMINAL
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
        constructor() { this.reset(); }
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
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79,140,255,${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function connectParticles() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                const dx = particles[a].x - particles[b].x;
                const dy = particles[a].y - particles[b].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(79,140,255,${0.05 * (1 - dist / 150)})`;
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


// ========== NAVBAR ==========
(function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 40));
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach(l => l.addEventListener('click', () => navLinks.classList.remove('open')));
})();


// ========== SCROLL REVEAL ==========
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


// ========== INTERACTIVE TERMINAL DEMO ==========
(function initDemo() {

    // ── State ──────────────────────────────────────────────────
    let sessionId = '';
    let currentKey = '';
    let currentUsername = '';
    let isConnected = false;
    let isAuthenticated = false;
    let cmdHistory = [];
    let historyIndex = -1;
    let busy = false;

    // ── DOM ────────────────────────────────────────────────────
    const clientTerminal = document.getElementById('clientTerminal');
    const serverTerminal = document.getElementById('serverTerminal');
    const clientStatus   = document.getElementById('clientStatus');
    const serverStatus   = document.getElementById('serverStatus');
    const networkPacket  = document.getElementById('networkPacket');
    const interceptedBody = document.getElementById('interceptedBody');
    const vizSteps       = document.getElementById('vizSteps');
    const termInput      = document.getElementById('termInput');
    const termEnterBtn   = document.getElementById('termEnterBtn');

    // ── API Helper ─────────────────────────────────────────────
    async function api(endpoint, body = null) {
        const opts = {
            method: body === null ? 'GET' : 'POST',
            headers: body ? { 'Content-Type': 'application/json' } : {}
        };
        if (body) opts.body = JSON.stringify(body);
        const r = await fetch(`/api/${endpoint}`, opts);
        if (!r.ok) {
            const e = await r.json().catch(() => ({ error: 'Server error' }));
            throw new Error(e.error || 'Request failed');
        }
        return r.json();
    }

    // ── Terminal output helpers ────────────────────────────────
    function addLine(term, html, extraClass) {
        const el = document.createElement('div');
        el.className = 'term-line' + (extraClass ? ' ' + extraClass : '');
        el.innerHTML = html;
        term.appendChild(el);
        term.scrollTop = term.scrollHeight;
    }

    function cLine(html, cls) { addLine(clientTerminal, html, cls); }
    function sLine(html, cls) { addLine(serverTerminal, html, cls); }

    const C = {
        info:    t => `<span class="term-info">${t}</span>`,
        success: t => `<span class="term-success">${t}</span>`,
        error:   t => `<span class="term-error">${t}</span>`,
        warn:    t => `<span class="term-warn">${t}</span>`,
        dim:     t => `<span class="term-dim">${t}</span>`,
        accent:  t => `<span class="term-accent">${t}</span>`,
        purple:  t => `<span class="term-purple">${t}</span>`,
        prompt:  t => `<span class="term-prompt">$</span> ${t}`,
        echo:    t => `<span class="term-cmd-echo">▸ ${t}</span>`
    };

    function sep(term) { addLine(term, '<span class="term-dim">──────────────────────────────────────────</span>'); }

    // ── Viz helpers ────────────────────────────────────────────
    function clearViz() { vizSteps.innerHTML = ''; }

    function viz(icon, color, title, detail, delay = 0) {
        const el = document.createElement('div');
        el.className = 'viz-step';
        el.style.animationDelay = `${delay}ms`;
        el.innerHTML = `
            <div class="viz-step-icon ${color}">${icon}</div>
            <div class="viz-step-content">
                <div class="viz-step-title">${title}</div>
                <div class="viz-step-detail">${detail}</div>
            </div>`;
        vizSteps.appendChild(el);
    }

    function animatePacket(dir) {
        networkPacket.className = 'dn-packet';
        void networkPacket.offsetWidth;
        networkPacket.classList.add(dir === 'down' ? 'animate-down' : 'animate-up');
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function setStatus(client, server, connected) {
        clientStatus.textContent = client;
        serverStatus.textContent = server;
        clientStatus.classList.toggle('connected', connected);
        serverStatus.classList.toggle('connected', connected);
    }

    // ── COMMAND HANDLER ────────────────────────────────────────
    const COMMANDS = {
        // ── help ────────────────────────────────────────────────
        help: async () => {
            cLine('');
            cLine(C.accent('  Available Commands:'));
            cLine('');
            const cmds = [
                ['connect',              'Establish TCP connection + key exchange'],
                ['login &lt;user&gt; &lt;pass&gt;',   'Authenticate with username and password'],
                ['send &lt;message&gt;',       'Send encrypted + SHA-256 hashed message'],
                ['tamper &lt;message&gt;',     'Send message with FAKE hash (tamper demo)'],
                ['status',               'Show current session info'],
                ['log',                  'Read the server log.txt file'],
                ['clear',                'Clear this terminal'],
                ['disconnect',           'Disconnect from server'],
                ['help',                 'Show this help'],
            ];
            cmds.forEach(([cmd, desc]) => {
                cLine(`  ${C.accent(cmd.padEnd(22))} ${C.dim(desc)}`);
            });
            cLine('');
        },

        // ── connect ─────────────────────────────────────────────
        connect: async () => {
            if (isConnected) {
                cLine(C.prompt(C.warn('Already connected. Type disconnect first.')));
                return;
            }
            clearViz();
            cLine('');
            cLine(C.prompt(C.info('Initiating TCP connection to 127.0.0.1:5000...')));
            await sleep(400);
            sLine('');
            sLine(C.success('[+] Incoming connection from 127.0.0.1'));
            viz('🔌', 'blue', 'Step 1 — TCP Connection Established',
                'Client created a TCP socket and connected to server at <strong>127.0.0.1:5000</strong>.<br>Server accepted and spawned a new thread for this client.', 0);

            // Real API call → Fernet.generate_key()
            await sleep(500);
            let keyData;
            try { keyData = await api('generate-key', {}); }
            catch (e) {
                cLine(C.prompt(C.error(`[ERROR] Cannot reach backend: ${e.message}`)));
                cLine(C.prompt(C.error('Make sure python app.py is running!')));
                return;
            }

            currentKey = keyData.key;
            sessionId  = keyData.session_id;

            sLine(C.info(`[KEY] Fernet.generate_key() called`));
            sLine(C.dim(`[KEY] Generated: ${currentKey}`));
            animatePacket('up');
            await sleep(700);
            cLine(C.prompt(C.info(`[KEY] Received from server: ${currentKey.substring(0, 28)}...`)));
            viz('🔑', 'purple', 'Step 2 — Real Fernet Key Exchange (encryption.py)',
                `Server called <strong>Fernet.generate_key()</strong> and sent the key to client.<br><strong>Full Key:</strong> ${currentKey}`, 150);

            isConnected = true;
            setStatus('Connected', 'Active', true);
            sep(clientTerminal);
            cLine(C.success('✅ Connection established! Key exchange complete.'));
            cLine(C.dim('    Now use: login &lt;username&gt; &lt;password&gt;'));
            cLine('');
        },

        // ── login ───────────────────────────────────────────────
        login: async (args) => {
            if (!isConnected) {
                cLine(C.prompt(C.warn('Not connected. Run connect first.')));
                return;
            }
            if (isAuthenticated) {
                cLine(C.prompt(C.warn(`Already authenticated as ${currentUsername}. Disconnect to re-login.`)));
                return;
            }
            const [username, password] = args;
            if (!username || !password) {
                cLine(C.prompt(C.error('Usage: login &lt;username&gt; &lt;password&gt;')));
                return;
            }

            clearViz();
            cLine('');
            cLine(C.prompt(C.info(`Authenticating as "${username}"...`)));
            await sleep(300);

            let r;
            try { r = await api('authenticate', { session_id: sessionId, username, password }); }
            catch (e) {
                cLine(C.prompt(C.error(`[ERROR] ${e.message}`)));
                return;
            }

            // Client encrypts credentials
            cLine(C.prompt(C.accent(`[AUTH] Plaintext: ${r.auth_plaintext}`)));
            cLine(C.prompt(C.accent(`[AUTH] Encrypted: ${r.auth_encrypted.substring(0, 55)}...`)));
            viz('🔒', 'cyan', 'Step 3a — Real Fernet Encryption (encryption.py)',
                `Client encrypted credentials using Fernet key.<br><strong>Plaintext:</strong> ${r.auth_plaintext}<br><strong>Ciphertext:</strong> ${r.auth_encrypted.substring(0, 80)}...`, 0);

            animatePacket('down');
            interceptedBody.textContent = r.auth_encrypted;
            await sleep(600);

            // Server decrypts
            sLine(C.accent('[AUTH] Encrypted credentials received'));
            sLine(C.accent(`[AUTH] Fernet.decrypt() → "${r.auth_decrypted}"`));
            viz('🔓', 'purple', 'Step 3b — Real Fernet Decryption (encryption.py)',
                `Server decrypted the ciphertext back to plaintext.<br><strong>Result:</strong> ${r.auth_decrypted}`, 100);

            await sleep(400);

            if (r.success) {
                sLine(C.success(`[AUTH SUCCESS] ${r.username} authenticated ✅`));
                sLine(C.dim(`[AUTH] Server response (encrypted): ${r.response_encrypted.substring(0, 40)}...`));
                animatePacket('up');
                await sleep(500);
                cLine(C.prompt(C.success(`[AUTH] Server response: ${r.response_decrypted} ✅`)));
                viz('✅', 'green', 'Step 3c — Authentication SUCCESS (server.py)',
                    `Server checked <strong>${r.auth_decrypted}</strong> against VALID_USERS database.<br>Match found → sent encrypted <strong>AUTH_SUCCESS</strong> back to client.`, 200);

                isAuthenticated = true;
                currentUsername = r.username;
                setStatus(`Authed: ${r.username}`, `Client: ${r.username}`, true);
                sep(clientTerminal);
                cLine(C.success(`✅ Logged in as ${r.username}. Session active.`));
                cLine(C.dim('    Now use: send &lt;your message&gt;'));
            } else {
                sLine(C.error(`[AUTH FAILED] "${username}" not in VALID_USERS ❌`));
                animatePacket('up');
                await sleep(500);
                cLine(C.prompt(C.error(`[AUTH] Server response: ${r.response_decrypted} ❌`)));
                viz('❌', 'red', 'Step 3c — Authentication FAILED (server.py)',
                    `Server checked <strong>${r.auth_decrypted}</strong> against VALID_USERS — no match found.<br>Server sent encrypted <strong>AUTH_FAILED</strong> and closed the session.`, 200);
                // session was killed server-side, reset local too
                isConnected = false;
                sessionId = '';
                currentKey = '';
                setStatus('Disconnected', 'Listening', false);
            }
            cLine('');
        },

        // ── send ────────────────────────────────────────────────
        send: async (args) => {
            if (!isAuthenticated) {
                cLine(C.prompt(C.warn('Not authenticated. Run connect then login first.')));
                return;
            }
            const message = args.join(' ');
            if (!message) { cLine(C.prompt(C.error('Usage: send &lt;message&gt;'))); return; }

            clearViz();
            await executeMessage(message, false);
        },

        // ── tamper ──────────────────────────────────────────────
        tamper: async (args) => {
            if (!isAuthenticated) {
                cLine(C.prompt(C.warn('Not authenticated. Run connect then login first.')));
                return;
            }
            const message = args.join(' ');
            if (!message) { cLine(C.prompt(C.error('Usage: tamper &lt;message&gt;'))); return; }

            clearViz();
            await executeMessage(message, true);
        },

        // ── status ──────────────────────────────────────────────
        status: async () => {
            cLine('');
            cLine(C.accent('  Session Status:'));
            cLine('');
            cLine(`  Connected:     ${isConnected ? C.success('Yes') : C.error('No')}`);
            cLine(`  Authenticated: ${isAuthenticated ? C.success(`Yes — ${currentUsername}`) : C.error('No')}`);
            cLine(`  Session ID:    ${sessionId ? C.dim(sessionId.substring(0, 30) + '...') : C.dim('None')}`);
            cLine(`  Fernet Key:    ${currentKey ? C.dim(currentKey.substring(0, 30) + '...') : C.dim('None')}`);
            cLine(`  Server:        ${C.dim('127.0.0.1:5001 (Flask/VPN backend)')}`);
            cLine('');
        },

        // ── log ─────────────────────────────────────────────────
        log: async () => {
            cLine('');
            cLine(C.info('  Reading log.txt from server...'));
            cLine('');
            try {
                const data = await api('log');
                if (data.lines.length === 0) {
                    cLine(C.dim('  log.txt is empty — no messages logged yet'));
                } else {
                    data.lines.forEach((line, i) => {
                        cLine(`  ${C.dim(`${i + 1}.`)} ${C.success(line)}`);
                    });
                }
            } catch (e) {
                cLine(C.error(`  [ERROR] Could not read log: ${e.message}`));
            }
            cLine('');
        },

        // ── clear ───────────────────────────────────────────────
        clear: async () => {
            clientTerminal.innerHTML = '';
            clearViz();
            vizSteps.innerHTML = '<div class="viz-placeholder">Run a command to see the process visualization here.</div>';
        },

        // ── disconnect ──────────────────────────────────────────
        disconnect: async () => {
            if (!isConnected) {
                cLine(C.prompt(C.warn('Not connected.')));
                return;
            }
            cLine('');
            cLine(C.prompt(C.warn('Closing connection...')));
            try { await api('reset', { session_id: sessionId }); } catch (_) {}
            await sleep(300);
            sLine(C.warn(`[-] Client ${currentUsername || 'unknown'} disconnected`));

            isConnected = false;
            isAuthenticated = false;
            sessionId = '';
            currentKey = '';
            currentUsername = '';
            interceptedBody.textContent = 'No data in transit';
            networkPacket.className = 'dn-packet';
            setStatus('Disconnected', 'Listening', false);
            clearViz();
            vizSteps.innerHTML = '<div class="viz-placeholder">Run a command to see the process visualization here.</div>';

            sep(clientTerminal);
            cLine(C.dim('Session closed. Type connect to start a new session.'));
            cLine('');
        }
    };

    // ── Core message send/tamper logic ─────────────────────────
    async function executeMessage(message, tampered) {
        cLine('');

        let r;
        try {
            r = await api('send-message', {
                session_id: sessionId,
                message,
                tampered,
                username: currentUsername
            });
        } catch (e) {
            cLine(C.prompt(C.error(`[ERROR] ${e.message}`)));
            return;
        }

        // Client side output
        cLine(C.prompt(C.info(`[MSG] Plaintext: "${r.message}"`)));
        viz('📝', 'blue', 'Original Message', `<strong>Plaintext:</strong> "${r.message}"`, 0);
        await sleep(350);

        if (tampered) {
            cLine(C.prompt(C.warn(`[HASH] ⚠️ FAKE hash injected: ${r.sent_hash.substring(0, 30)}...`)));
            viz('💀', 'red', 'Tampered Hash Injected (Attack Simulation)',
                `Real hash was replaced with all zeros (simulating attacker tampering).<br><strong>Fake Hash:</strong> ${r.sent_hash}<br><strong>Real SHA-256 should be:</strong> ${r.real_hash}`, 80);
        } else {
            cLine(C.prompt(C.purple(`[HASH] SHA-256: ${r.real_hash.substring(0, 30)}...`)));
            viz('🧬', 'purple', 'Real SHA-256 Hash Computed (security.py)',
                `<code>hashlib.sha256("${r.message}").hexdigest()</code><br><strong>Full Hash:</strong> ${r.real_hash}`, 80);
        }
        await sleep(350);

        cLine(C.prompt(C.accent(`[COMBINED] ${r.combined.substring(0, 60)}...`)));
        viz('📎', 'cyan', 'Message + Hash Combined',
            `Format: <code>message||hash</code><br><strong>Combined:</strong> ${r.combined.substring(0, 90)}...`, 160);
        await sleep(350);

        cLine(C.prompt(C.accent(`[ENCRYPTED] ${r.encrypted.substring(0, 50)}...`)));
        viz('🔒', 'blue', 'Real Fernet Encryption Applied (encryption.py)',
            `<code>Fernet.encrypt(combined)</code><br><strong>Ciphertext:</strong> ${r.encrypted.substring(0, 90)}...`, 240);
        await sleep(300);

        // Network transit
        animatePacket('down');
        interceptedBody.textContent = r.encrypted;
        cLine(C.prompt(C.info('[SEND] → Transmitting encrypted payload over network...')));
        viz('📡', 'orange', 'Ciphertext Transmitted Over Network',
            `An attacker sniffing the network sees only:<br><strong>${r.encrypted.substring(0, 70)}...</strong><br>Cannot decrypt without the Fernet key.`, 320);
        await sleep(700);

        // Server side output
        sLine('');
        sLine(C.info('[RECV] Encrypted data received'));
        sLine(C.dim(`[INTERCEPTED] ${r.encrypted.substring(0, 50)}...`));
        await sleep(350);

        sLine(C.accent(`[DECRYPT] Fernet.decrypt() → ${r.decrypted.substring(0, 55)}...`));
        viz('🔓', 'purple', 'Server Decrypts Data (encryption.py)',
            `<code>Fernet.decrypt(data)</code><br><strong>Result:</strong> ${r.decrypted.substring(0, 90)}...`, 400);
        await sleep(350);

        sLine(C.accent(`[SPLIT] msg="${r.dec_message}" | hash="${r.received_hash.substring(0, 20)}..."`));
        await sleep(350);

        sLine(C.purple(`[VERIFY] Recalculated: ${r.calculated_hash.substring(0, 28)}...`));
        sLine(C.purple(`[VERIFY] Received:     ${r.received_hash.substring(0, 28)}...`));
        await sleep(400);

        if (r.verified) {
            sLine(C.success(`[VALID] ✅ verify_hash() = True — Message accepted: "${r.dec_message}"`));
            sLine(C.dim('[LOG] Message written to log.txt'));
            viz('✅', 'green', 'Integrity Verification PASSED (security.py)',
                `<code>verify_hash("${r.dec_message}", hash)</code> returned <strong>True</strong><br><strong>Calculated:</strong> ${r.calculated_hash}<br><strong>Received:</strong>  ${r.received_hash}<br>Message logged to <strong>log.txt</strong>`, 480);
            sep(clientTerminal);
            cLine(C.success(`✅ Message delivered & verified: "${r.dec_message}"`));
        } else {
            sLine(C.error('[WARNING] ❌ verify_hash() = False — DATA TAMPERED!'));
            sLine(C.error(`[WARNING] Expected: ${r.calculated_hash.substring(0, 32)}...`));
            sLine(C.error(`[WARNING] Received: ${r.received_hash.substring(0, 32)}...`));
            viz('❌', 'red', 'Integrity Verification FAILED (security.py)',
                `<code>verify_hash("${r.dec_message}", hash)</code> returned <strong>False</strong><br><strong>Expected hash:</strong> ${r.calculated_hash}<br><strong>Received hash:</strong> ${r.received_hash}<br>Message <strong>REJECTED</strong> — tampering detected!`, 480);
            sep(clientTerminal);
            cLine(C.error(`❌ TAMPER DETECTED! Message "${r.dec_message}" was rejected by server.`));
        }
        cLine('');
    }

    // ── Run a command string ───────────────────────────────────
    async function runCommand(raw) {
        const trimmed = raw.trim();
        if (!trimmed) return;

        // Add to history
        cmdHistory.unshift(trimmed);
        if (cmdHistory.length > 50) cmdHistory.pop();
        historyIndex = -1;

        // Echo command in terminal
        cLine(C.echo(trimmed), 'term-cmd-echo');

        const parts = trimmed.split(/\s+/);
        const cmd   = parts[0].toLowerCase();
        const args  = parts.slice(1);

        if (busy) {
            cLine(C.dim('  (busy, please wait...)'));
            return;
        }
        busy = true;
        termInput.disabled = true;
        termEnterBtn.disabled = true;

        try {
            if (COMMANDS[cmd]) {
                await COMMANDS[cmd](args);
            } else {
                cLine(C.error(`  Command not found: "${cmd}". Type help for commands.`));
            }
        } catch (e) {
            cLine(C.error(`  Unexpected error: ${e.message}`));
        } finally {
            busy = false;
            termInput.disabled = false;
            termEnterBtn.disabled = false;
            termInput.focus();
        }
    }

    // ── Keyboard input handling ────────────────────────────────
    termInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const val = termInput.value;
            termInput.value = '';
            await runCommand(val);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < cmdHistory.length - 1) {
                historyIndex++;
                termInput.value = cmdHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                termInput.value = cmdHistory[historyIndex];
            } else {
                historyIndex = -1;
                termInput.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const partial = termInput.value.toLowerCase().trim();
            const match = Object.keys(COMMANDS).find(c => c.startsWith(partial));
            if (match) termInput.value = match + ' ';
        }
    });

    termEnterBtn.addEventListener('click', async () => {
        const val = termInput.value;
        termInput.value = '';
        await runCommand(val);
    });

    // ── Wire up cmd-run-btn and cmd-chip buttons ───────────────
    document.querySelectorAll('.cmd-run-btn, .cmd-chip').forEach(btn => {
        btn.addEventListener('click', async () => {
            const cmd = btn.dataset.cmd;
            if (!cmd) return;
            termInput.value = '';
            // Highlight the active step card
            document.querySelectorAll('.cmd-step').forEach(s => s.classList.remove('active-step'));
            const parentStep = btn.closest('.cmd-step');
            if (parentStep) parentStep.classList.add('active-step');
            // Scroll terminal into view
            document.getElementById('demoClient').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            await runCommand(cmd);
        });
    });

    // ── Auto-focus terminal input on click ────────────────────
    document.getElementById('demoClient').addEventListener('click', () => termInput.focus());

    // ── Show "hint" on first load ─────────────────────────────
    setTimeout(() => {
        cLine('');
        cLine(C.dim('  Tip: Use ↑ ↓ arrows for command history, Tab to autocomplete'));
        cLine('');
    }, 800);

})();
