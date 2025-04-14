const config = {
    development: {
        port: 3000,
        sessionSecret: 'your-secret-key',
        secure: false, // HTTP for local development
        domain: 'localhost'
    },
    production: {
        port: process.env.PORT || 3000,
        sessionSecret: process.env.SESSION_SECRET || 'change-this-in-production',
        secure: true, // HTTPS required in production
        domain: process.env.SITE_URL || '215webconnect.netlify.app', // Default to Netlify domain
        mongoUri: process.env.MONGODB_URI
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
