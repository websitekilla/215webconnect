const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = config.port;

// Admin credentials - Change these to your desired values
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'websitekilla',
    password: process.env.ADMIN_PASSWORD || 'Islam2025'
};

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'style-src': ["'self'", "'unsafe-inline'"],
        },
    },
}));

// Rate limiting for brute force protection
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 login attempts per windowMs
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware with secure settings
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.secure, // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict',
        domain: config.domain
    }
}));

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// In-memory user store (replace with a database in production)
const users = {};

// Create default admin user if it doesn't exist
const createDefaultAdmin = async () => {
    try {
        // Hash the admin password
        const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);
        users[ADMIN_CREDENTIALS.username] = {
            password: hashedPassword,
            isAdmin: true
        };
        console.log('Default admin user created successfully');
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('Current admin credentials:');
            console.log('Username:', ADMIN_CREDENTIALS.username);
            console.log('Password:', ADMIN_CREDENTIALS.password);
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
};

// Initialize admin user immediately
createDefaultAdmin();

// Auth middleware
const requireAdmin = (req, res, next) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Auth routes
app.post('/api/login', loginLimiter, async (req, res) => {
    console.log('Login attempt:', req.body.username);
    const { username, password } = req.body;
    
    const user = users[username];

    if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
        const match = await bcrypt.compare(password, user.password);
        console.log('Password match:', match);
        
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = {
            username,
            isAdmin: user.isAdmin
        };

        // Set secure cookie in production
        if (process.env.NODE_ENV === 'production') {
            req.session.cookie.secure = true;
        }

        console.log('Login successful:', username);
        res.json({ success: true, isAdmin: user.isAdmin });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin password change route
app.post('/api/change-password', requireAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const username = req.session.user.username;
    const user = users[username];

    try {
        // Verify current password
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        users[username].password = hashedPassword;

        // Update the stored credentials
        ADMIN_CREDENTIALS.password = newPassword;

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

// User status route
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({
            isLoggedIn: true,
            isAdmin: users[req.session.user.username]?.isAdmin || false
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

// Protect admin panel
app.get('/admin.html', requireAdmin, (req, res, next) => {
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Server listening on port ${PORT}`);
});
