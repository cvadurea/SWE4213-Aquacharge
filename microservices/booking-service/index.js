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
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3007';

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
                type VARCHAR(30) NOT NULL DEFAULT 'regular',
                status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
                v2g_energy_discharged NUMERIC(12, 4),
                v2g_price_per_kwh NUMERIC(10, 4),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // Add column if older DB already exists
        await pool.query(`
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'regular';
        `);

        await pool.query(`
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS v2g_energy_discharged NUMERIC(12, 4);
        `);

        await pool.query(`
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS v2g_price_per_kwh NUMERIC(10, 4);
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS v2g_transactions (
                transaction_id SERIAL PRIMARY KEY,
                booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                price_per_kwh NUMERIC(10, 4) NOT NULL,
                energy_discharged NUMERIC(12, 4) NOT NULL,
                payment NUMERIC(12, 4) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS v2g_settings (
                id SERIAL PRIMARY KEY,
                price_per_kwh NUMERIC(10, 4) NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                metadata JSONB,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
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

const fetchVesselOwnerIds = async () => {
    const response = await fetch(`${USER_SERVICE_URL}/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch users (HTTP ${response.status})`);
    }

    const users = await response.json();
    if (!Array.isArray(users)) {
        return [];
    }

    return users
        .filter((user) => user && user.type === 'vessel_owner')
        .map((user) => parsePositiveInt(user.id))
        .filter(Boolean);
};

const createV2GPriceUpdateNotifications = async ({ newPricePerKwh, previousPricePerKwh }) => {
    try {
        const vesselOwnerIds = await fetchVesselOwnerIds();
        const uniqueUserIds = [...new Set(vesselOwnerIds)];

        if (uniqueUserIds.length === 0) {
            console.log('No vessel owners found for V2G price update notifications.');
            return;
        }

        const title = 'V2G price updated';
        const message = previousPricePerKwh == null
            ? `A new V2G price has been set to $${newPricePerKwh.toFixed(2)} per kWh.`
            : `V2G price changed from $${previousPricePerKwh.toFixed(2)} to $${newPricePerKwh.toFixed(2)} per kWh.`;

        await pool.query(
            `
                INSERT INTO user_notifications (user_id, type, title, message, metadata)
                SELECT
                    user_id,
                    'v2g_price_updated',
                    $1,
                    $2,
                    $3::jsonb
                FROM UNNEST($4::int[]) AS user_id
            `,
            [
                title,
                message,
                JSON.stringify({
                    new_price_per_kwh: newPricePerKwh,
                    previous_price_per_kwh: previousPricePerKwh,
                }),
                uniqueUserIds,
            ]
        );

        console.log('Created V2G price update notifications:', {
            recipients: uniqueUserIds.length,
            newPricePerKwh,
            previousPricePerKwh,
        });
    } catch (error) {
        console.error('Failed to create V2G price update notifications:', error);
    }
};

const sendBookingConfirmationNotification = async ({ userId, booking }) => {
    try {
        const response = await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/booking-confirmation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                booking,
            }),
        });

        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json')
            ? await response.json()
            : { message: await response.text() };

        if (!response.ok) {
            console.error('Booking confirmation notification failed:', response.status, body);
            return;
        }

        console.log('Booking confirmation notification sent/queued:', {
            bookingId: booking.id,
            userId,
            notification: body,
        });
    } catch (error) {
        console.error('Error calling notification service:', error);
    }
};

app.post('/bookings', async (req, res) => {
    const { user_id, vessel_id, port_id, charger_id, start_time, end_time, booking_type, energy_discharged_kwh } = req.body;

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
        const normalizedType = String(booking_type || 'regular').toLowerCase();
        if (!['regular', 'bidirectional'].includes(normalizedType)) {
            return res.status(400).json({ message: "booking_type must be 'regular' or 'bidirectional'." });
        }

        let energyKwh = null;
        let pricePerKwh = null;
        if (normalizedType === 'bidirectional') {
            const parsedEnergy = Number(energy_discharged_kwh);
            if (!Number.isFinite(parsedEnergy) || parsedEnergy <= 0) {
                return res.status(400).json({ message: 'energy_discharged_kwh must be a positive number for bidirectional bookings.' });
            }
            energyKwh = parsedEnergy;
            pricePerKwh = Number(process.env.V2G_PRICE_PER_KWH || '0.20');
        }

        const overlapResult = await pool.query(
            `
                SELECT id
                FROM bookings
                WHERE charger_id = $1
                                    AND status IN ('pending', 'confirmed', 'active')
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
                INSERT INTO bookings (
                    user_id,
                    vessel_id,
                    port_id,
                    charger_id,
                    start_time,
                    end_time,
                    type,
                    status,
                    v2g_energy_discharged,
                    v2g_price_per_kwh
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9)
                RETURNING *
            `,
            [
                parsedUserId,
                parsedVesselId,
                parsedPortId,
                parsedChargerId,
                startTime.toISOString(),
                endTime.toISOString(),
                normalizedType,
                energyKwh,
                pricePerKwh,
            ]
        );

        const booking = result.rows[0];

        // Fire-and-forget so booking creation is not blocked by notification latency/failures.
        setImmediate(() => {
            void sendBookingConfirmationNotification({
                userId: parsedUserId,
                booking,
            });
        });

        return res.status(201).json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/v2g/price', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT price_per_kwh, updated_at FROM v2g_settings ORDER BY updated_at DESC LIMIT 1'
        );

        let pricePerKwh = Number(process.env.V2G_PRICE_PER_KWH || '0.20');
        let updatedAt = null;

        if (result.rows.length > 0) {
            const row = result.rows[0];
            const dbPrice = Number(row.price_per_kwh);
            if (Number.isFinite(dbPrice) && dbPrice > 0) {
                pricePerKwh = dbPrice;
                updatedAt = row.updated_at;
            }
        }

        return res.json({ price_per_kwh: pricePerKwh, updated_at: updatedAt });
    } catch (error) {
        console.error('Error fetching V2G price:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.put('/v2g/price', async (req, res) => {
    const { price_per_kwh } = req.body || {};
    const parsed = Number(price_per_kwh);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return res.status(400).json({ message: 'price_per_kwh must be a positive number.' });
    }

    try {
        const existingPriceResult = await pool.query(
            'SELECT price_per_kwh FROM v2g_settings ORDER BY updated_at DESC LIMIT 1'
        );

        let previousPricePerKwh = null;
        if (existingPriceResult.rows.length > 0) {
            const existing = Number(existingPriceResult.rows[0].price_per_kwh);
            if (Number.isFinite(existing) && existing > 0) {
                previousPricePerKwh = existing;
            }
        }

        const result = await pool.query(
            `
                INSERT INTO v2g_settings (price_per_kwh)
                VALUES ($1)
                RETURNING *
            `,
            [parsed]
        );

        if (previousPricePerKwh == null || Math.abs(previousPricePerKwh - parsed) > Number.EPSILON) {
            setImmediate(() => {
                void createV2GPriceUpdateNotifications({
                    newPricePerKwh: parsed,
                    previousPricePerKwh,
                });
            });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating V2G price:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/notifications/user/:user_id', async (req, res) => {
    const parsedUserId = parsePositiveInt(req.params.user_id);
    const unreadOnly = String(req.query.unreadOnly || 'true').toLowerCase() !== 'false';
    const parsedLimit = parsePositiveInt(req.query.limit || 10) || 10;
    const limit = Math.min(parsedLimit, 50);

    if (!parsedUserId) {
        return res.status(400).json({ message: 'Invalid user id.' });
    }

    try {
        const result = await pool.query(
            `
                SELECT id, user_id, type, title, message, metadata, is_read, created_at
                FROM user_notifications
                WHERE user_id = $1
                  AND ($2 = FALSE OR is_read = FALSE)
                ORDER BY created_at DESC
                LIMIT $3
            `,
            [parsedUserId, unreadOnly, limit]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user notifications:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.put('/notifications/user/:user_id/read-all', async (req, res) => {
    const parsedUserId = parsePositiveInt(req.params.user_id);
    if (!parsedUserId) {
        return res.status(400).json({ message: 'Invalid user id.' });
    }

    try {
        const result = await pool.query(
            `
                UPDATE user_notifications
                SET is_read = TRUE
                WHERE user_id = $1
                  AND is_read = FALSE
            `,
            [parsedUserId]
        );

        return res.json({ message: 'Notifications marked as read.', updated: result.rowCount || 0 });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.put('/notifications/user/:user_id/:notification_id/read', async (req, res) => {
    const parsedUserId = parsePositiveInt(req.params.user_id);
    const parsedNotificationId = parsePositiveInt(req.params.notification_id);

    if (!parsedUserId || !parsedNotificationId) {
        return res.status(400).json({ message: 'Invalid user id or notification id.' });
    }

    try {
        const result = await pool.query(
            `
                UPDATE user_notifications
                SET is_read = TRUE
                WHERE id = $1
                  AND user_id = $2
                  AND is_read = FALSE
                RETURNING id
            `,
            [parsedNotificationId, parsedUserId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found or already read.' });
        }

        return res.json({ message: 'Notification marked as read.', id: result.rows[0].id });
    } catch (error) {
        console.error('Error marking notification as read:', error);
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
            `
                SELECT
                    b.*,
                    (
                        SELECT row_to_json(t)
                        FROM v2g_transactions t
                        WHERE t.booking_id = b.id
                        ORDER BY t.created_at DESC
                        LIMIT 1
                    ) AS v2g_transaction
                FROM bookings b
                WHERE b.user_id = $1
                ORDER BY b.start_time DESC
            `,
            [parsedUserId]
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/bookings/port/:port_id', async (req, res) => {
    const parsedPortId = parsePositiveInt(req.params.port_id);
    if (!parsedPortId) {
        return res.status(400).json({ message: 'Invalid port id.' });
    }

    const statusParam = String(req.query.status || 'active').toLowerCase();
    const now = new Date();

    const ACTIVE_STATUSES = ['pending', 'confirmed', 'active'];
    const CANCELLED_STATUSES = ['cancelled'];
    const VERIFICATION_STATUSES = ['pending_verification'];
    const COMPLETED_STATUSES = ['completed'];
    const FAILED_STATUSES = ['failed'];

    let statuses = ACTIVE_STATUSES;
    let includeTimeFilter = true;
    if (statusParam === 'all') {
        statuses = [...ACTIVE_STATUSES, ...CANCELLED_STATUSES, ...VERIFICATION_STATUSES, ...COMPLETED_STATUSES, ...FAILED_STATUSES];
    } else if (statusParam === 'cancelled') {
        statuses = CANCELLED_STATUSES;
    } else if (statusParam === 'verification') {
        statuses = VERIFICATION_STATUSES;
        includeTimeFilter = false;
    } else if (statusParam === 'completed') {
        statuses = COMPLETED_STATUSES;
        includeTimeFilter = false;
    } else if (statusParam === 'failed') {
        statuses = FAILED_STATUSES;
        includeTimeFilter = false;
    } else if (statusParam === 'active') {
        statuses = ACTIVE_STATUSES;
    } else {
        return res.status(400).json({ message: "Invalid status. Use 'active', 'verification', 'completed', 'failed', 'cancelled', or 'all'." });
    }

    try {
        const timeClause = includeTimeFilter ? 'AND end_time > $3' : '';
        const result = await pool.query(
            `
                SELECT *
                FROM bookings
                WHERE port_id = $1
                  AND status = ANY($2)
                  ${timeClause}
                ORDER BY start_time ASC
            `,
            includeTimeFilter ? [parsedPortId, statuses, now.toISOString()] : [parsedPortId, statuses]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error('Error fetching port bookings:', error);
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

app.put('/bookings/:id/start', async (req, res) => {
    const parsedBookingId = parsePositiveInt(req.params.id);
    if (!parsedBookingId) {
        return res.status(400).json({ message: 'Invalid booking id.' });
    }

    try {
        const currentResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [parsedBookingId]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const current = currentResult.rows[0];
        if (current.status !== 'confirmed') {
            return res.status(400).json({ message: "Only confirmed bookings can be started." });
        }

        const updateResult = await pool.query(
            `
                UPDATE bookings
                SET status = 'active'
                WHERE id = $1
                  AND status = 'confirmed'
                  AND NOW() >= start_time
                  AND NOW() < end_time
                RETURNING *
            `,
            [parsedBookingId]
        );

        if (updateResult.rows.length === 0) {
            const timeCheckResult = await pool.query(
                'SELECT start_time, end_time FROM bookings WHERE id = $1',
                [parsedBookingId]
            );

            if (timeCheckResult.rows.length === 0) {
                return res.status(404).json({ message: 'Booking not found.' });
            }

            const timing = timeCheckResult.rows[0];
            const startTime = new Date(timing.start_time);
            const endTime = new Date(timing.end_time);
            const now = new Date();

            if (now < startTime) {
                return res.status(400).json({ message: 'Booking can only be started once the scheduled start time is reached.' });
            }

            if (now >= endTime) {
                return res.status(400).json({ message: 'This booking has already ended.' });
            }

            return res.status(400).json({ message: 'Booking cannot be started at this time.' });
        }

        return res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error starting booking:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.put('/bookings/:id/end', async (req, res) => {
    const parsedBookingId = parsePositiveInt(req.params.id);
    if (!parsedBookingId) {
        return res.status(400).json({ message: 'Invalid booking id.' });
    }

    try {
        const currentResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [parsedBookingId]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const current = currentResult.rows[0];
        if (current.status !== 'active') {
            return res.status(400).json({ message: 'Only active bookings can be ended.' });
        }

        const nextStatus = current.type === 'bidirectional' ? 'pending_verification' : 'completed';

        const updateResult = await pool.query(
            'UPDATE bookings SET status = $2 WHERE id = $1 AND status = \'active\' RETURNING *',
            [parsedBookingId, nextStatus]
        );

        if (updateResult.rows.length === 0) {
            return res.status(400).json({ message: 'Booking could not be ended.' });
        }

        return res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error ending booking:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.put('/bookings/:id/verification', async (req, res) => {
    const parsedBookingId = parsePositiveInt(req.params.id);
    const { verified } = req.body || {};

    if (!parsedBookingId) {
        return res.status(400).json({ message: 'Invalid booking id.' });
    }

    if (typeof verified !== 'boolean') {
        return res.status(400).json({ message: 'verified must be true or false.' });
    }

    try {
        const currentResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [parsedBookingId]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const current = currentResult.rows[0];
        if (current.status !== 'pending_verification') {
            return res.status(400).json({ message: 'Only bookings pending verification can be reviewed.' });
        }

        if (!verified) {
            const failedResult = await pool.query(
                "UPDATE bookings SET status = 'failed' WHERE id = $1 AND status = 'pending_verification' RETURNING *",
                [parsedBookingId]
            );

            return res.json(failedResult.rows[0]);
        }

        let transaction = null;
        const existingTransaction = await pool.query(
            'SELECT * FROM v2g_transactions WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1',
            [parsedBookingId]
        );

        if (existingTransaction.rows.length > 0) {
            transaction = existingTransaction.rows[0];
        } else {
            const energy = Number(current.v2g_energy_discharged);
            const price = Number(current.v2g_price_per_kwh);

            if (!Number.isFinite(energy) || energy <= 0 || !Number.isFinite(price) || price <= 0) {
                return res.status(400).json({ message: 'Missing V2G pricing information for this booking.' });
            }

            const payment = energy * price;
            const txResult = await pool.query(
                `
                    INSERT INTO v2g_transactions (booking_id, price_per_kwh, energy_discharged, payment)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `,
                [parsedBookingId, price, energy, payment]
            );

            transaction = txResult.rows[0];
        }

        const confirmedResult = await pool.query(
            "UPDATE bookings SET status = 'completed' WHERE id = $1 AND status = 'pending_verification' RETURNING *",
            [parsedBookingId]
        );

        return res.json({
            ...confirmedResult.rows[0],
            v2g_transaction: transaction,
        });
    } catch (error) {
        console.error('Error verifying booking:', error);
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

        const current = currentResult.rows[0];
        if (!['pending', 'confirmed'].includes(current.status)) {
            return res.status(400).json({ message: 'Only pending or confirmed bookings can be cancelled.' });
        }

        const updateResult = await pool.query(
            "UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status IN ('pending', 'confirmed') RETURNING *",
            [parsedBookingId]
        );

        return res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error cancelling booking:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.get('/chargers/:charger_id/timeslots', async (req, res) => {
    const parsedChargerId = parsePositiveInt(req.params.charger_id);
    const { start_date, end_date } = req.query;

    if (!parsedChargerId) {
        return res.status(400).json({ message: 'Invalid charger id.' });
    }

    if (!start_date || !end_date) {
        return res.status(400).json({ message: 'start_date and end_date are required.' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format.' });
    }

    if (endDate <= startDate) {
        return res.status(400).json({ message: 'end_date must be after start_date.' });
    }

    try {
        // Get all bookings for this charger in the date range
        const bookingsResult = await pool.query(
            `
                SELECT start_time, end_time
                FROM bookings
                WHERE charger_id = $1
                                    AND status IN ('pending', 'confirmed', 'active')
                  AND start_time < $3
                  AND end_time > $2
                ORDER BY start_time
            `,
            [parsedChargerId, startDate.toISOString(), endDate.toISOString()]
        );

        const bookings = bookingsResult.rows;

        // Generate 15-minute timeslots
        const timeslots = [];
        const slotDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
        let currentTime = new Date(startDate);

        while (currentTime < endDate) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(currentTime.getTime() + slotDuration);

            // Check if this slot overlaps with any booking
            const isBooked = bookings.some(booking => {
                const bookingStart = new Date(booking.start_time);
                const bookingEnd = new Date(booking.end_time);
                return !(slotEnd <= bookingStart || slotStart >= bookingEnd);
            });

            timeslots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                available: !isBooked
            });

            currentTime = slotEnd;
        }

        return res.json({
            charger_id: parsedChargerId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            timeslots
        });
    } catch (error) {
        console.error('Error fetching timeslots:', error);
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