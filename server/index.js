const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
// Serve Static Files (Frontend Build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Supabase Integration
const { supabase } = require('./supabase');

// Data Directory (Persist in AppData)
const DATA_DIR = process.env.USER_DATA_PATH || __dirname;

// === LICENSE LOGIC (Singleton / Global) ===
let activeLicense = null;

app.post('/api/verify-license', async (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Chave não fornecida' });

    try {
        const { data, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('key_string', key)
            .single();

        if (error || !data) {
            return res.status(401).json({ error: 'Chave inválida ou não encontrada.' });
        }

        if (data.status !== 'active' && data.status !== 'unused') {
            return res.status(403).json({ error: `Chave bloqueada (Status: ${data.status})` });
        }

        // Activate if unused
        if (data.status === 'unused') {
            await supabase.from('licenses').update({ status: 'active' }).eq('id', data.id);
        }

        activeLicense = data;
        fs.writeFileSync(path.join(DATA_DIR, 'license.json'), JSON.stringify(data));
        res.json({ success: true, license: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao verificar licença.' });
    }
});

app.get('/api/check-license', (req, res) => {
    if (!activeLicense) {
        const licPath = path.join(DATA_DIR, 'license.json');
        if (fs.existsSync(licPath)) {
            try {
                activeLicense = JSON.parse(fs.readFileSync(licPath));
            } catch (e) { }
        }
    }
    if (activeLicense) {
        res.json({ valid: true, license: activeLicense });
    } else {
        res.json({ valid: false });
    }
});
// ==========================================


// === SESSION MANAGER ===
// We support instanceId = '1', '2', '3', '4', '5'

const puppeteer = require('puppeteer');
let executablePath = puppeteer.executablePath();
if (executablePath.includes('app.asar')) {
    executablePath = executablePath.replace('app.asar', 'app.asar.unpacked');
}

// Utils
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const formatNumber = (num) => {
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.length >= 10 && cleaned.length <= 11) {
        cleaned = '55' + cleaned;
    }
    return `${cleaned}@c.us`;
};

// Class to encapsulate a WhatsApp Instance
class WhatsAppInstance {
    constructor(id, io) {
        this.id = id;
        this.io = io;
        this.client = null;
        this.isReady = false;
        this.activeQueue = false;
        this.currentSessionUser = null;
        this.lastQr = '';

        // Paths
        this.sessionDir = path.join(DATA_DIR, `session-${id}`);
        this.historyFile = path.join(this.sessionDir, 'history.json');
        this.rulesFile = path.join(this.sessionDir, 'chatbot_rules.json');

        // Ensure Dirs
        if (!fs.existsSync(this.sessionDir)) fs.mkdirSync(this.sessionDir, { recursive: true });
        if (!fs.existsSync(this.historyFile)) fs.writeFileSync(this.historyFile, '[]');
        if (!fs.existsSync(this.rulesFile)) fs.writeFileSync(this.rulesFile, '[]');

        // NO AUTO INIT
        // this.initialize(); 
    }

    emit(event, data) {
        // Emit to room specific to this instance
        this.io.to(`instance-${this.id}`).emit(event, { instanceId: this.id, data });
    }

    async start() {
        if (this.client || this.isReady) return; // Already started

        console.log(`[Instance ${this.id}] Starting...`);
        this.emit('status_change', 'STARTING');

        try {
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `client-${this.id}`,
                    dataPath: DATA_DIR
                }),
                puppeteer: {
                    executablePath: executablePath,
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        // Optimization Flags
                        '--disable-extensions',
                        '--disable-component-extensions-with-background-pages',
                        '--disable-default-apps',
                        '--no-default-browser-check',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-infobars',
                        '--disable-breakpad',
                        '--disable-canvas-aa',
                        '--disable-2d-canvas-clip-aa',
                        '--disable-gl-drawing-for-tests',
                        '--enable-low-end-device-mode'
                    ]
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
                }
            });

            this.setupListeners();
            await this.client.initialize();
        } catch (err) {
            console.error(`[Instance ${this.id}] Start Error:`, err.message);
            this.emit('status_change', 'STOPPED');
            this.client = null;
        }
    }

    setupListeners() {
        this.client.on('qr', (qr) => {
            console.log(`[Instance ${this.id}] QR Received`);
            this.lastQr = qr;
            this.emit('qr', qr);
        });

        this.client.on('ready', () => {
            console.log(`[Instance ${this.id}] Ready!`);
            this.isReady = true;
            this.lastQr = '';
            this.currentSessionUser = this.client.info.wid.user;
            this.emit('ready', { status: true, user: this.currentSessionUser });
        });

        this.client.on('authenticated', () => {
            console.log(`[Instance ${this.id}] Authenticated!`);
            this.emit('authenticated', { status: true });
        });

        this.client.on('auth_failure', (msg) => {
            console.error(`[Instance ${this.id}] Auth Failure`, msg);
            this.emit('auth_failure', msg);
        });

        this.client.on('message', async (msg) => {
            if (!msg.body) return;
            const chat = await msg.getChat();
            if (chat.isGroup) return;

            const incomingText = msg.body.toLowerCase().trim();
            // console.log(`[Instance ${this.id}] Msg from ${msg.from}: ${incomingText}`);

            try {
                const rules = this.getRules();
                // Find matching rule
                const matchedRule = rules.find(rule =>
                    rule.enabled !== false && // Check if enabled (default true if undefined)
                    rule.triggers.some(trigger => incomingText === trigger || incomingText.includes(trigger))
                );

                if (matchedRule) {
                    const userId = msg.from.split('@')[0];

                    // Check One Time Per User
                    if (matchedRule.oncePerUser && matchedRule.processedUsers?.includes(userId)) {
                        console.log(`[Instance ${this.id}] Rule '${matchedRule.name}' skipped for ${userId} (Already processed)`);
                        return;
                    }

                    console.log(`[Instance ${this.id}] Chatbot Triggered: ${matchedRule.name}`);
                    await sleep(1500);
                    await this.executeFlow(msg.from, matchedRule.steps, 'AutoResponder');

                    // If oncePerUser, record it
                    if (matchedRule.oncePerUser) {
                        if (!matchedRule.processedUsers) matchedRule.processedUsers = [];
                        matchedRule.processedUsers.push(userId);
                        this.saveRules(rules); // Save persistence
                    }
                }
            } catch (e) {
                console.error(`[Instance ${this.id}] Chatbot Error:`, e);
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log(`[Instance ${this.id}] Disconnected:`, reason);
            this.isReady = false;
            this.currentSessionUser = null;
            this.emit('disconnected', reason);
            this.emit('status_change', 'STOPPED'); // Mark as stopped
            // Do NOT destory immediately if we want to allow reconnect, but for lazy load:
            if (this.client) {
                this.client.destroy().catch(() => { });
                this.client = null;
            }
        });
    }

    // Helper: Execute Flow
    async executeFlow(chatId, steps, sourceLabel) {
        console.log(`[Instance ${this.id}: ${sourceLabel}] Executing Flow for ${chatId}`);

        for (let s = 0; s < steps.length; s++) {
            const step = steps[s];
            try {
                if (step.type === 'text') {
                    if (!this.client) throw new Error('Client not ready');
                    await this.client.sendMessage(chatId, step.content);
                }
                else if (step.type === 'media' || step.type === 'audio') {
                    if (!step.path || !fs.existsSync(step.path)) throw new Error('Arquivo inválido/não encontrado.');
                    const media = MessageMedia.fromFilePath(step.path);
                    const options = {};
                    if (step.type === 'audio') options.sendAudioAsVoice = true;
                    if (step.caption) options.caption = step.caption;
                    if (!this.client) throw new Error('Client not ready');
                    await this.client.sendMessage(chatId, media, options);
                }
                else if (step.type === 'delay') {
                    await sleep(step.ms);
                }
            } catch (stepErr) {
                console.error(`[Instance ${this.id}: ${sourceLabel}] Step Error:`, stepErr.message);

                // Retry specifically for No LID error by using @c.us explicitly or specific user format if needed
                if (stepErr.message.includes('No LID')) {
                    console.log('Retrying with bare user ID...');
                    // Sometimes just retrying helps, but if it persists, we might need a library update
                    // or ensure chatId is correct.
                }
                throw stepErr;
            }

            if (step.type !== 'delay') await sleep(1000);
        }
    }

    // History Helpers
    getHistory() {
        try {
            return JSON.parse(fs.readFileSync(this.historyFile));
        } catch { return []; }
    }

    appendToHistory(entry) {
        try {
            const list = this.getHistory();
            list.push(entry);
            fs.writeFileSync(this.historyFile, JSON.stringify(list, null, 2));
        } catch (err) { console.error(err); }
    }

    // Rules Helpers
    getRules() {
        try {
            return JSON.parse(fs.readFileSync(this.rulesFile));
        } catch { return []; }
    }

    saveRules(newRules) {
        fs.writeFileSync(this.rulesFile, JSON.stringify(newRules, null, 2));
    }

    // Actions
    async logout() {
        if (this.client) await this.client.logout();
        this.client = null; // Clean ref
    }

    stopCampaign() {
        this.activeQueue = false;
        console.log(`[Instance ${this.id}] Queue stopped by user.`);
    }

    async startCampaign(numbers, steps, minDelay, maxDelay, intervalUnit) {
        if (this.activeQueue) throw new Error('Já existe uma campanha em andamento nesta instância.');

        let multiplier = 1000;
        if (intervalUnit === 'minutes') multiplier = 60 * 1000;
        if (intervalUnit === 'hours') multiplier = 60 * 60 * 1000;

        this.activeQueue = true;
        this.emit('log', { type: 'info', message: `🚀 Iniciando envio para ${numbers.length} contatos.`, timestamp: new Date() });

        for (let i = 0; i < numbers.length; i++) {
            if (!this.activeQueue) {
                this.emit('log', { type: 'info', message: '⏹️ Campanha PARADA pelo usuário.', timestamp: new Date() });
                this.emit('done', { message: 'Campanha interrompida.' });
                return;
            }

            const rawNumber = numbers[i];
            const chatId = formatNumber(rawNumber);

            try {
                await this.executeFlow(chatId, steps, rawNumber);

                const formatted = rawNumber;
                this.appendToHistory({ user: this.currentSessionUser, number: formatted, status: 'success', message: 'Fluxo enviado', timestamp: new Date() });
                this.emit('log', { type: 'success', number: formatted, message: `Enviado para ${formatted}`, timestamp: new Date() });

            } catch (err) {
                const formatted = rawNumber;
                this.appendToHistory({ user: this.currentSessionUser || 'unknown', number: formatted, status: 'failed', message: err.message, timestamp: new Date() });
                this.emit('log', { type: 'error', number: formatted, message: `Falha ${formatted}: ${err.message}`, timestamp: new Date() });
            }

            if (i < numbers.length - 1) {
                const delayVal = randomDelay(minDelay || 10, maxDelay || 30);
                this.emit('log', { type: 'info', message: `⏳ Aguardando ${delayVal} ${intervalUnit === 'seconds' ? 's' : intervalUnit}...`, timestamp: new Date() });
                await sleep(delayVal * multiplier);
            }
        }

        this.activeQueue = false;
        this.emit('log', { type: 'done', message: '✅ Campanha Finalizada!', timestamp: new Date() });
        this.emit('done', { message: 'Finalizado' });
    }
}
// ==========================================


// Initialize Server & Instances
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Store Instances
const instances = new Map();

// Initialize 5 Instances
for (let i = 1; i <= 5; i++) {
    const id = i.toString();
    instances.set(id, new WhatsAppInstance(id, io));
}

// Socket Namespacing/Rooms
io.on('connection', (socket) => {
    // Client joins an instance room to listen to events
    socket.on('join-instance', (instanceId) => {
        socket.join(`instance-${instanceId}`);
        const inst = instances.get(instanceId);
        if (inst) {
            // Send current state immediately with instanceId wrapper
            if (inst.isReady && inst.currentSessionUser) {
                socket.emit('ready', { instanceId, data: { status: true, user: inst.currentSessionUser } });
                socket.emit('authenticated', { instanceId, data: { status: true } });
            } else if (inst.client) {
                // Starting but not ready (or QR)
                if (inst.lastQr) {
                    socket.emit('qr', { instanceId, data: inst.lastQr });
                } else {
                    socket.emit('status_change', { instanceId, data: 'STARTING' }); // Infer starting if client exists but not ready
                }
            } else {
                // Stopped
                socket.emit('status_change', { instanceId, data: 'STOPPED' });
            }
        }
    });

    socket.on('leave-instance', (instanceId) => {
        socket.leave(`instance-${instanceId}`);
    });
});

// === API ROUTES (Dynamic Instance Handling) ===

// Middleware to get instance
const getInstance = (req, res, next) => {
    const { instanceId } = req.params;
    const inst = instances.get(instanceId);
    if (!inst) return res.status(404).json({ error: 'Instância não encontrada' });
    req.instance = inst;
    next();
};

// ** NEW INIT ROUTE **
app.post('/api/:instanceId/init', getInstance, async (req, res) => {
    try {
        req.instance.start(); // Async but we don't wait for full ready
        res.json({ status: 'initializing' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/:instanceId/logout', getInstance, async (req, res) => {
    try {
        await req.instance.logout();
        res.json({ status: 'logged_out' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/:instanceId/history', getInstance, (req, res) => {
    res.json(req.instance.getHistory());
});

app.post('/api/:instanceId/stop', getInstance, (req, res) => {
    req.instance.stopCampaign();
    res.json({ status: 'stopped' });
});

app.post('/api/:instanceId/send', getInstance, async (req, res) => {
    const { numbers, steps, minDelay, maxDelay, intervalUnit } = req.body;

    if (!req.instance.isReady) return res.status(400).json({ error: 'WhatsApp Off-line nesta instância.' });
    if (!numbers?.length) return res.status(400).json({ error: 'Lista vazia.' });

    try {
        // Run in background (async)
        req.instance.startCampaign(numbers, steps, minDelay, maxDelay, intervalUnit)
            .catch(err => console.error(`[Instance ${req.instance.id}] Campaign Error:`, err));

        res.json({ status: 'started' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Chatbot Rules
app.get('/api/:instanceId/chatbot/rules', getInstance, (req, res) => {
    res.json(req.instance.getRules());
});

app.post('/api/:instanceId/chatbot/rules', getInstance, (req, res) => {
    const { name, triggers, steps, enabled, oncePerUser } = req.body;
    const inst = req.instance;
    const rules = inst.getRules();

    // Check if new rule or edit? Currently only new.
    // If user provides ID, it is edit. (Not implemented in UI yet but good for backend)

    const newRule = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        triggers: triggers.map(t => t.toLowerCase().trim()),
        steps,
        enabled: enabled !== false, // default true
        oncePerUser: !!oncePerUser,
        processedUsers: [],
        createdAt: new Date()
    };
    rules.push(newRule);
    inst.saveRules(rules);
    res.json({ success: true, rule: newRule });
});

app.put('/api/:instanceId/chatbot/rules/:id', getInstance, (req, res) => {
    // Edit Rule (Toggle status etc)
    const inst = req.instance;
    let rules = inst.getRules();
    const ruleIndex = rules.findIndex(r => r.id === req.params.id);

    if (ruleIndex === -1) return res.status(404).json({ error: 'Regra não encontrada' });

    // Merge updates
    const updates = req.body;
    rules[ruleIndex] = { ...rules[ruleIndex], ...updates };

    inst.saveRules(rules);
    res.json({ success: true, rule: rules[ruleIndex] });
});

app.delete('/api/:instanceId/chatbot/rules/:id', getInstance, (req, res) => {
    const inst = req.instance;
    let rules = inst.getRules();
    rules = rules.filter(r => r.id !== req.params.id);
    inst.saveRules(rules);
    res.json({ success: true });
});

// Groups (Requires Client Ready)
app.get('/api/:instanceId/groups', getInstance, async (req, res) => {
    if (!req.instance.isReady) return res.status(400).json({ error: 'Offline' });
    try {
        const chats = await req.instance.client.getChats();
        const groups = chats.filter(chat => chat.isGroup).map(chat => ({
            id: chat.id._serialized,
            name: chat.name,
            participantsCount: chat.participants.length
        }));
        res.json(groups);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/:instanceId/groups/:id/participants', getInstance, async (req, res) => {
    if (!req.instance.isReady) return res.status(400).json({ error: 'Offline' });
    try {
        const chat = await req.instance.client.getChatById(req.params.id);
        if (!chat.isGroup) return res.status(400).json({ error: 'Not a group' });
        const participants = chat.participants.map(p => ({
            id: p.id._serialized,
            user: p.id.user,
            isAdmin: p.isAdmin,
            isSuperAdmin: p.isSuperAdmin
        }));
        res.json(participants);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve frontend fallback
app.get(/.*/, (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} - Multi-Instance (5) Active`);
});
