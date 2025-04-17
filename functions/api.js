const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const router = express.Router();

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://www.215webconnect.com', 'https://215webconnect.com']
        : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
};

app.set('trust proxy', 1);
app.use(session(sessionConfig));

// Add request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Auth middleware
const requireAuth = (req, res, next) => {
    console.log('Session:', req.session);
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Routes
router.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    const correctUsername = process.env.ADMIN_USERNAME || 'websitekilla';
    const correctPassword = process.env.ADMIN_PASSWORD || 'Islam2025';

    if (username === correctUsername && password === correctPassword) {
        req.session.isAuthenticated = true;
        req.session.username = username;
        console.log('Login successful:', username);
        res.json({ success: true });
    } else {
        console.log('Login failed:', username);
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

router.post('/logout', (req, res) => {
    const username = req.session.username;
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            res.status(500).json({ error: 'Failed to logout' });
        } else {
            console.log('Logout successful:', username);
            res.json({ success: true });
        }
    });
});

router.get('/user', (req, res) => {
    console.log('Session check:', req.session);
    res.json({
        isLoggedIn: req.session.isAuthenticated === true,
        username: req.session.username
    });
});

router.post('/save-theme', requireAuth, async (req, res) => {
    try {
        const themeSettings = req.body;
        const themeFilePath = path.join(__dirname, 'theme-settings.json');
        
        await fs.writeFile(themeFilePath, JSON.stringify(themeSettings, null, 2));
        console.log('Theme saved by:', req.session.username);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving theme:', error);
        res.status(500).json({ error: 'Failed to save theme settings' });
    }
});

router.get('/theme-settings', async (req, res) => {
    try {
        const themeFilePath = path.join(__dirname, 'theme-settings.json');
        const data = await fs.readFile(themeFilePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        // If theme file doesn't exist, return default theme
        const defaultTheme = {
            theme: {
                colors: {
                    primary: '#007bff',
                    background: '#ffffff',
                    text: '#333333'
                },
                content: {
                    heroTitle: '215 WEB CONNECT',
                    heroSubtitle: 'Building Digital Excellence'
                }
            }
        };
        res.json(defaultTheme);
    }
});

app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
