const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const prisma = new PrismaClient();
const PORT = 3002;

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
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
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        if (password.length < 6 || !password.match(/[A-Z]/) || !password.match(/[a-z]/) || !password.match(/[0-9]/)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters and include uppercase, lowercase, and a number' });
        }
        const password_hash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,  
                password_hash,
                type,
                first_name,
                last_name,
            },
        });
        res.status(201).json({ message: 'User registered successfully', user: { id: user.id, email: user.email, type: user.type } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});