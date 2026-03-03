const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(express.json());

const PORT = 3007;
const prisma = new PrismaClient();

app.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                type: true,
            },
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }   
});

app.listen(PORT, () => {
    console.log(`User Management Service running on port ${PORT}`);
});