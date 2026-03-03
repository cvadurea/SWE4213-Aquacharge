const jwt = require('jsonwebtoken');

function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer') {
        return res.status(401).json({ message: 'Invalid authorization scheme' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

function role(requiredRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (req.user.type !== requiredRole) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
}

module.exports = {
    auth,
    role,
};