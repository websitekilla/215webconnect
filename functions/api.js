const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const router = express.Router();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
};

// Only use MongoDB session store in production
if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI) {
    sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    });
}

app.use(session(sessionConfig));

// Auth middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Routes
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const correctUsername = process.env.ADMIN_USERNAME || 'websitekilla';
    const correctPassword = process.env.ADMIN_PASSWORD || 'Islam2025';

    if (username === correctUsername && password === correctPassword) {
        req.session.isAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.status(500).json({ error: 'Failed to logout' });
        } else {
            res.json({ success: true });
        }
    });
});

router.get('/user', (req, res) => {
    res.json({
        isLoggedIn: req.session.isAuthenticated === true
    });
});

router.post('/save-theme', requireAuth, async (req, res) => {
    try {
        const themeSettings = req.body;
        const themeFilePath = path.join(__dirname, 'theme-settings.json');
        
        await fs.writeFile(themeFilePath, JSON.stringify(themeSettings, null, 2));
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
