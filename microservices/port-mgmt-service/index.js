const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3006;

const poolPort = new Pool({
    host: process.env.DB_HOST || 'port-db',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'portdb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const poolCharger = new Pool({
    host: process.env.DB_HOST || 'charger-db',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'chargerdb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const initPortDB = async () => {
    try {
        await poolPort.query(`
            CREATE TABLE IF NOT EXISTS ports (
                id SERIAL PRIMARY KEY,
                port_name VARCHAR(255) NOT NULL,
                address VARCHAR(255) NOT NULL,
                capacity INTEGER NOT NULL,
                available_charging_points INTEGER NOT NULL
            );
        `);
        console.log('Ports table initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

const initChargerDB = async () => {
    try {
        await poolCharger.query(`
            CREATE TABLE IF NOT EXISTS chargers (
                id SERIAL PRIMARY KEY,
                port_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                is_available BOOLEAN NOT NULL DEFAULT TRUE,
                FOREIGN KEY (port_id) REFERENCES ports(id)
            );
        `);
        console.log('Chargers table initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

const waitForDBs = async (retries = 10, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await poolPort.query('SELECT 1');
            await poolCharger.query('SELECT 1');
            return;
        } catch (error) {
            console.error(`Error connecting to database (attempt ${i + 1}/${retries}):`, error);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error('Failed to connect to the database');
};

app.get('/ports', async (req, res) => {
    try {
        const result = await poolPort.query('SELECT * FROM ports');
        const ports = result.rows;
        res.json(ports);
    } catch (error) {
        console.error('Error fetching ports:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/ports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await poolPort.query('SELECT * FROM ports WHERE id = $1', [id]);
        const port = result.rows[0];
        if (port) {
            res.json(port);
        } else {
            res.status(404).json({ message: 'Port not found' });
        }
    } catch (error) {
        console.error('Error fetching port:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/ports', async (req, res) => {
    const { port_name, address, capacity, available_charging_points } = req.body;
    try {
        const result = await poolPort.query(
            'INSERT INTO ports (port_name, address, capacity, available_charging_points) VALUES ($1, $2, $3, $4) RETURNING *',
            [port_name, address, capacity, available_charging_points]
        );
        const newPort = result.rows[0];
        res.status(201).json(newPort);
    } catch (error) {
        console.error('Error creating port:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/ports/:id/chargers', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await poolCharger.query('SELECT * FROM chargers WHERE port_id = $1', [id]);
        const chargers = result.rows;
        res.json(chargers);
    } catch (error) {
        console.error('Error fetching chargers:', error);
        res.status(500).json({ message: 'Server error' });
    }   
});

app.post('/ports/:id/chargers', async (req, res) => {
    const { id } = req.params;
    const { type, is_available } = req.body;  
    try {
        const result = await poolCharger.query(
            'INSERT INTO chargers (port_id, type, is_available) VALUES ($1, $2, $3) RETURNING *',
            [id, type, is_available || true]
        );
        const newCharger = result.rows[0];
        res.status(201).json(newCharger);
    } catch (error) {
        console.error('Error creating charger:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/chargers/:id', async (req, res) => {
    const { id } = req.params;
    const { type, is_available } = req.body;

    try {
        const result = await poolCharger.query(
            'UPDATE chargers SET is_available = $1 WHERE id = $2 RETURNING *',
            [is_available, id]
        );
        const updatedCharger = result.rows[0];
        if (updatedCharger) {
            res.json(updatedCharger);
        } else {
            res.status(404).json({ message: 'Charger not found' });
        }
    } catch (error) {
        console.error('Error updating charger:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/chargers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await poolCharger.query('DELETE FROM chargers WHERE id = $1 RETURNING *', [id]);
        const deletedCharger = result.rows[0];
        if (deletedCharger) {
            res.json({ message: 'Charger deleted successfully' });
        } else {
            res.status(404).json({ message: 'Charger not found' });
        }
    } catch (error) {
        console.error('Error deleting charger:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

waitForDBs().then(() => {
    initPortDB().then(() => {
        initChargerDB().then(() => {
            app.listen(PORT, () => {
                console.log(`Port Management Service running on port ${PORT}`);
            });
        });
    });
});