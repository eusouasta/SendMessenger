const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
// Serve Static Files (Frontend Build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Supabase Integration
const { supabase } = require('./supabase');

// License State
let activeLicense = null;

// API: Verify License
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

        // Save to local file for persistence
        fs.writeFileSync(path.join(DATA_DIR, 'license.json'), JSON.stringify(data));

        res.json({ success: true, license: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao verificar licença.' });
    }
});

app.get('/api/check-license', (req, res) => {
    // Attempt to auto-load license from file if not in memory
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

const server = http.createServer(app);
const io = new Server(server, { frameGuard: false, cors: { origin: "*", methods: ["GET", "POST"] } });

// Debug Logging to File
const LOG_FILE = path.join(process.env.USER_DATA_PATH || __dirname, 'debug.log');
const fileLog = (msg) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
};

// Override console
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => { fileLog('INFO: ' + args.join(' ')); originalLog(...args); };
console.error = (...args) => { fileLog('ERROR: ' + args.join(' ')); originalError(...args); };

// History File Path
// Use process.env.USER_DATA_PATH (set by Electron) or fallback to __dirname (dev mode)
const DATA_DIR = process.env.USER_DATA_PATH || __dirname;
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Ensure History File Exists
if (!fs.existsSync(HISTORY_FILE)) {
    // If using userData, ensure directory exists? usually app.getPath returns existing root, 
    // but just in case we are writing a file directly.
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

// Append to History Helper
const appendToHistory = (entry) => {
    try {
        const data = fs.readFileSync(HISTORY_FILE);
        const json = JSON.parse(data);
        json.push(entry);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(json, null, 2));
    } catch (err) {
        console.error('Error saving history:', err);
    }
};

// Initialize WhatsApp
const puppeteer = require('puppeteer');
let executablePath = puppeteer.executablePath();
if (executablePath.includes('app.asar')) {
    executablePath = executablePath.replace('app.asar', 'app.asar.unpacked');
}

let client = new Client({
    authStrategy: new LocalAuth({ dataPath: DATA_DIR }), // Persist session in AppData
    puppeteer: {
        executablePath: executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;
let currentSessionUser = null;
let activeQueue = false; // Flag to control the queue loop

const initializeClient = () => {
    client.on('qr', (qr) => {
        console.log('QR Received');
        io.emit('qr', qr);
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        isReady = true;
        currentSessionUser = client.info.wid.user;
        io.emit('ready', { status: true, user: currentSessionUser });
    });

    client.on('authenticated', () => {
        console.log('Client is authenticated!');
        io.emit('authenticated', { status: true });
    });

    client.on('auth_failure', (msg) => {
        console.error('AUTH FAILURE', msg);
        io.emit('auth_failure', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('Client disconnected', reason);
        isReady = false;
        currentSessionUser = null;
        io.emit('disconnected', reason);
        client.destroy();
        client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
        });
        initializeClient();
        client.initialize();
    });

    client.initialize();
};

initializeClient();

// API: Logout
app.post('/api/logout', async (req, res) => {
    try {
        await client.logout();
        res.json({ status: 'logged_out' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Get History
app.get('/api/history', (req, res) => {
    try {
        const data = fs.readFileSync(HISTORY_FILE);
        res.json(JSON.parse(data));
    } catch (err) {
        res.json([]);
    }
});

// API: Stop/Pause
app.post('/api/stop', (req, res) => {
    activeQueue = false; // This will break the loop
    console.log('Stopping queue requested by user.');
    res.json({ status: 'stopped' });
});

// Helper: Smart Format
const formatNumber = (num) => {
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.length >= 10 && cleaned.length <= 11) {
        cleaned = '55' + cleaned;
    }
    return `${cleaned}@c.us`;
};

// Utils
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// API: Send
app.post('/api/send', async (req, res) => {
    const { numbers, message, minDelay, maxDelay, intervalUnit } = req.body;

    if (!isReady) return res.status(400).json({ error: 'WhatsApp não está conectado.' });
    if (!numbers || !numbers.length) return res.status(400).json({ error: 'Nenhum número fornecido.' });
    if (activeQueue) return res.status(400).json({ error: 'Já existe uma campanha em andamento.' });

    let multiplier = 1000;
    if (intervalUnit === 'minutes') multiplier = 60 * 1000;
    if (intervalUnit === 'hours') multiplier = 60 * 60 * 1000;

    activeQueue = true;
    res.json({ status: 'started', message: `Iniciando envio para ${numbers.length} contatos.` });

    console.log('Starting Queue...');

    // Process Loop
    for (let i = 0; i < numbers.length; i++) {
        // CHECK STOP FLAG
        if (!activeQueue) {
            console.log('Queue stopped by user.');
            io.emit('log', { type: 'info', message: '⏹️ Campanha PARADA pelo usuário.', timestamp: new Date() });
            io.emit('done', { message: 'Campanha interrompida.' });
            return;
        }

        const rawNumber = numbers[i];
        const chatId = formatNumber(rawNumber);
        const timestamp = new Date();

        try {
            await client.sendMessage(chatId, message);
            console.log(`Sent to ${rawNumber}`);

            // Log Success
            // Log to local file
            const formatted = rawNumber; // Correct var name usage
            appendToHistory({ user: client.info.wid.user, number: formatted, status: 'success', message: message, timestamp: new Date() });

            // Log to Supabase (Cloud)
            if (activeLicense) {
                supabase.from('message_logs').insert([{
                    license_key: activeLicense.key_string,
                    phone_number: formatted,
                    status: 'success',
                    message_content: message,
                    sent_at: new Date()
                }]).then(({ error }) => { if (error) console.error('Supabase Log Error:', error); });
            }

            io.emit('log', { type: 'success', number: formatted, message: 'Enviado com sucesso', timestamp: new Date() });

        } catch (err) {
            console.error(`Failed to send to ${rawNumber}:`, err);
            const formatted = rawNumber;

            // Log Failure to Supabase
            if (activeLicense) {
                supabase.from('message_logs').insert([{
                    license_key: activeLicense.key_string,
                    phone_number: formatted,
                    status: 'failed',
                    message_content: err.message,
                    sent_at: new Date()
                }]).then(() => { });
            }

            appendToHistory({ user: client.info?.wid?.user || 'unknown', number: formatted, status: 'failed', message: err.message, timestamp: new Date() });
            io.emit('log', { type: 'error', number: formatted, message: 'Falha ao enviar', timestamp });
        }

        // Delay logic
        if (i < numbers.length - 1) {
            const delayVal = randomDelay(minDelay || 10, maxDelay || 30);
            const finalDelayMs = delayVal * multiplier;

            io.emit('log', { type: 'info', message: `⏳ Aguardando ${delayVal} ${intervalUnit === 'seconds' ? 's' : intervalUnit}...`, timestamp: new Date() });

            // Sleep in chunks to allow faster stopping?
            // For simplicity, just await. If user stops mid-sleep, it will stop next loop logic check.
            await sleep(finalDelayMs);
        }
    }

    // Keep activeQueue False initially
    activeQueue = false;
    io.emit('log', { type: 'done', message: '✅ Campanha Finalizada com Sucesso!', timestamp: new Date() });
    io.emit('done', { message: 'Finalizado' });
    console.log('Queue Finished');
});

// Fallback for React Routing (Express 5 compatible wildcard)
app.get(/.*/, (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
