const express = require('express');
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const app = express();
app.use(express.json());

const PORT = 3004;

const pool = new Pool({
  host: process.env.DB_HOST || 'fleet-db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fleetdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vessels (
                id SERIAL PRIMARY KEY,
                owner_id VARCHAR(255) UNIQUE NOT NULL,
                vessel_name VARCHAR(255) NOT NULL,
                vessel_model VARCHAR(255) NOT NULL,
                registration_number VARCHAR(255) NOT NULL,
                battery_capacity INTEGER NOT NULL,
                is_primary BOOLEAN NOT NULL DEFAULT FALSE
            );
        `);
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

const waitForDB = async (retries = 10, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Connected to database');
      return;
    } catch (err) {
      console.log(`Waiting for database... attempt ${i + 1}/${retries}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Could not connect to database');
};

app.get('/vessels', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vessels');   
        const vessels = result.rows;
        res.json(vessels);
    } catch (error) {
        console.error('Error fetching vessels:', error);
        res.status(500).json({ message: 'Server error' });
    }   
});

app.get('/vessels/:owner_id', auth.auth , async (req, res) => {
    const { owner_id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM vessels WHERE owner_id = $1', [owner_id]);
        const vessels = result.rows;
        res.json(vessels);
    } catch (error) {
        console.error('Error fetching vessels:', error);
        res.status(500).json({ message: 'Server error' });
    } 
});

app.post('/vessels', auth.auth, async (req, res) => {
    const { owner_id, vessel_name, vessel_model, registration_number, battery_capacity, is_primary } = req.body;    
    if (!owner_id || !vessel_name || !vessel_model || !registration_number || !battery_capacity) {
        return res.status(400).json({ message: 'All fields except is_primary are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO vessels (owner_id, vessel_name, vessel_model, registration_number, battery_capacity, is_primary) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [owner_id, vessel_name, vessel_model, registration_number, battery_capacity, is_primary || false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating vessel:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/vessels/:id', auth.auth, async (req, res) => {
    const { id } = req.params;
    const { vessel_name, vessel_model, registration_number, battery_capacity, is_primary } = req.body;
    try {
        const result = await pool.query(
            'UPDATE vessels SET vessel_name = $1, vessel_model = $2, registration_number = $3, battery_capacity = $4, is_primary = $5 WHERE id = $6 RETURNING *',
            [vessel_name, vessel_model, registration_number, battery_capacity, is_primary, id]
        );  
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vessel not found' });
        }
        res.json(result.rows[0]);
    } catch (error) { 
        console.error('Error updating vessel:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/vessels/:id', auth.auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM vessels WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vessel not found' });
        }
        res.json({ message: 'Vessel deleted successfully' });
    } catch (error) {
        console.error('Error deleting vessel:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

initDB().then(() => {
  waitForDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Fleet Management Service running on port ${PORT}`);
    });
  });
});