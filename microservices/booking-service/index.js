const express = require('express');
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

const PORT = 3003;

const pool = new Pool({
    host: process.env.DB_HOST || 'booking-db',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bookingdb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                vessel_id INTEGER NOT NULL,
                port_id INTEGER NOT NULL,
                charger_id INTEGER NOT NULL,
                start_time TIMESTAMPTZ NOT NULL,
                end_time TIMESTAMPTZ NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('Bookings table initialized');
    } catch (error) {
        console.error('Error initializing bookings database:', error);
    }
};

const waitForDB = async (retries = 10, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await pool.query('SELECT 1');
            console.log('Connected to booking database');
            return;
        } catch (err) {
            console.log(`Waiting for booking database... attempt ${i + 1}/${retries}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error('Could not connect to booking database');
};

const parsePositiveInt = (value) => {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        return null;
    }
    return number;
};

app.post('/bookings', async (req, res) => {
    const { user_id, vessel_id, port_id, charger_id, start_time, end_time } = req.body;

    const parsedUserId = parsePositiveInt(user_id);
    const parsedVesselId = parsePositiveInt(vessel_id);
    const parsedPortId = parsePositiveInt(port_id);
    const parsedChargerId = parsePositiveInt(charger_id);

    if (!parsedUserId || !parsedVesselId || !parsedPortId || !parsedChargerId || !start_time || !end_time) {
        return res.status(400).json({ message: 'All booking fields are required.' });
    }

    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        return res.status(400).json({ message: 'Invalid start_time or end_time.' });
    }

    if (endTime <= startTime) {
        return res.status(400).json({ message: 'end_time must be after start_time.' });
    }

    try {
        const overlapResult = await pool.query(
            `
                SELECT id
                FROM bookings
                WHERE charger_id = $1
                  AND status IN ('pending', 'confirmed')
                  AND NOT (end_time <= $2 OR start_time >= $3)
                LIMIT 1
            `,
            [parsedChargerId, startTime.toISOString(), endTime.toISOString()]
        );

        if (overlapResult.rows.length > 0) {
            return res.status(409).json({ message: 'This charger is already booked for the selected time range.' });
        }

        const result = await pool.query(
            `
                INSERT INTO bookings (user_id, vessel_id, port_id, charger_id, start_time, end_time, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
                RETURNING *
            `,
            [
                parsedUserId,
                parsedVesselId,
                parsedPortId,
                parsedChargerId,
                startTime.toISOString(),
                endTime.toISOString(),
            ]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/bookings/user/:user_id', async (req, res) => {
    const parsedUserId = parsePositiveInt(req.params.user_id);

    if (!parsedUserId) {
        return res.status(400).json({ message: 'Invalid user id.' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM bookings WHERE user_id = $1 ORDER BY start_time DESC',
            [parsedUserId]
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/bookings/:id', async (req, res) => {
    const parsedBookingId = parsePositiveInt(req.params.id);
    if (!parsedBookingId) {
        return res.status(400).json({ message: 'Invalid booking id.' });
    }

    try {
        const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [parsedBookingId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching booking by id:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.put('/bookings/:id/cancel', async (req, res) => {
    const parsedBookingId = parsePositiveInt(req.params.id);
    if (!parsedBookingId) {
        return res.status(400).json({ message: 'Invalid booking id.' });
    }

    try {
        const currentResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [parsedBookingId]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const updateResult = await pool.query(
            "UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *",
            [parsedBookingId]
        );

        return res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error cancelling booking:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        return res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Booking health check failed (DB):', err);
        return res.status(500).json({ status: 'error', error: 'database_unreachable' });
    }
});

waitForDB().then(() => {
    initDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Booking Service running on port ${PORT}`);
        });
    });
});