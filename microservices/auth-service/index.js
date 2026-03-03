const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

const PORT = 3002;

const pool = new Pool({
  host: process.env.DB_HOST || 'user-db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'userdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ 
            message: 'Login successful', 
            user: { 
                id: user.id, 
                email: user.email, 
                first_name: user.first_name,
                last_name: user.last_name,
                type: user.type
            }, 
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/register', async (req, res) => {
    const { email, password, type, first_name, last_name } = req.body;
    if (!email || !password || !type || !first_name || !last_name) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        if (password.length < 6 || !password.match(/[A-Z]/) || !password.match(/[a-z]/) || !password.match(/[0-9]/)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters and include uppercase, lowercase, and a number' });
        }
        const password_hash = await bcrypt.hash(password, 10);
        const user = await pool.query(`
            INSERT INTO users (email, password_hash, type, first_name, last_name)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, first_name, last_name, type
        `, [email, password_hash, type, first_name, last_name]);
        const token = jwt.sign({ userId: user.rows[0].id, email: user.rows[0].email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ 
            message: 'User registered successfully', 
            user: user.rows[0], 
            token,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});
