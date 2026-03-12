const express = require('express');
const { Pool } = require('pg');
const auth = require('./middleware/auth.js');

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
                owner_id VARCHAR(255) NOT NULL,
                vessel_name VARCHAR(255) NOT NULL,
                vessel_model VARCHAR(255) NOT NULL,
                registration_number VARCHAR(255) NOT NULL,
                battery_capacity INTEGER NOT NULL,
                is_primary BOOLEAN NOT NULL DEFAULT FALSE
            );
        `);

        // Ensure registration numbers are unique per owner
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS vessels_owner_reg_unique_idx
            ON vessels(owner_id, registration_number);
        `);

        console.log('Vessels table initialized');
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
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        let created;

        if (is_primary) {
            // Ensure this is the only primary vessel for this owner
            await client.query(
                'UPDATE vessels SET is_primary = FALSE WHERE owner_id = $1',
                [owner_id]
            );
            const insertResult = await client.query(
                'INSERT INTO vessels (owner_id, vessel_name, vessel_model, registration_number, battery_capacity, is_primary) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *',
                [owner_id, vessel_name, vessel_model, registration_number, battery_capacity]
            );
            created = insertResult.rows[0];
        } else {
            const insertResult = await client.query(
                'INSERT INTO vessels (owner_id, vessel_name, vessel_model, registration_number, battery_capacity, is_primary) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *',
                [owner_id, vessel_name, vessel_model, registration_number, battery_capacity]
            );
            created = insertResult.rows[0];
        }

        await client.query('COMMIT');
        res.status(201).json(created);
    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (_) {}
        }

        if (error && error.code === '23505') {
            // Unique violation on (owner_id, registration_number)
            return res.status(409).json({ message: 'A vessel with this registration number already exists for this owner.' });
        }

        console.error('Error creating vessel:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (client) client.release();
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

app.put('/vessels/:id/set-primary', auth.auth, async (req, res) => {
    const { id } = req.params;
    
    try {
        // First, get the vessel to find the owner_id
        const vesselResult = await pool.query('SELECT owner_id FROM vessels WHERE id = $1', [id]);
        if (vesselResult.rows.length === 0) {
            return res.status(404).json({ message: 'Vessel not found' });
        }

        const owner_id = vesselResult.rows[0].owner_id;

        // Set all other vessels for this owner to non-primary
        await pool.query(
            'UPDATE vessels SET is_primary = FALSE WHERE owner_id = $1 AND id != $2',
            [owner_id, id]
        );

        // Set this vessel to primary
        const result = await pool.query(
            'UPDATE vessels SET is_primary = TRUE WHERE id = $1 RETURNING *',
            [id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error setting primary vessel:', error);
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

waitForDB().then(() => {
  initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Fleet Management Service running on port ${PORT}`);
    });
  });
});