const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const router = express.Router();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'style-src': ["'self'", "'unsafe-inline'"],
        },
    },
}));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
};

app.use(session(sessionConfig));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
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
const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const requireAdmin = async (req, res, next) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Routes
router.post('/login', async (req, res) => {
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

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

router.post('/change-password', requireAdmin, async (req, res) => {
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

router.post('/save-theme', requireAuth, async (req, res) => {
    try {
        const themeSettings = req.body;
        await fs.writeFile(path.join(__dirname, 'theme-settings.json'), JSON.stringify(themeSettings, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving theme:', error);
        res.status(500).json({ error: 'Failed to save theme settings' });
    }
});

router.get('/theme-settings', async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'theme-settings.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading theme:', error);
        res.status(500).json({ error: 'Failed to read theme settings' });
    }
});

router.get('/user', (req, res) => {
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

app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
