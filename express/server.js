const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const config = require('../config');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'style-src': ["'self'", "'unsafe-inline'"],
        },
    },
}));

// MongoDB connection
mongoose.connect(config.mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    isAdmin: Boolean
});

const User = mongoose.model('User', UserSchema);

// Session middleware with MongoDB store
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: config.mongoUri,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: config.secure,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict',
        domain: config.domain
    }
}));

// Create default admin user if it doesn't exist
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: process.env.ADMIN_USERNAME || 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
            await User.create({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: hashedPassword,
                isAdmin: true
            });
            console.log('Default admin user created successfully');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
};

createDefaultAdmin();

// Auth middleware
const requireAdmin = async (req, res, next) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Auth routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = {
            username: user.username,
            isAdmin: user.isAdmin
        };

        res.json({ success: true, isAdmin: user.isAdmin });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/change-password', requireAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const username = req.session.user.username;

    try {
        const user = await User.findOne({ username });
        const match = await bcrypt.compare(currentPassword, user.password);
        
        if (!match) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne({ username }, { password: hashedPassword });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({
            isLoggedIn: true,
            isAdmin: req.session.user.isAdmin
        });
    } else {
        res.json({
            isLoggedIn: false,
            isAdmin: false
        });
    }
});

// Theme management routes
app.post('/api/save-theme', requireAdmin, async (req, res) => {
    try {
        await fs.writeFile(
            path.join(__dirname, 'theme-settings.json'),
            JSON.stringify(req.body, null, 2)
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving theme:', error);
        res.status(500).json({ error: 'Failed to save theme' });
    }
});

module.exports.handler = serverless(app);
