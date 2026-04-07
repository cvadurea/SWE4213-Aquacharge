const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

const PORT = 3005;

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3007';
const NOTIFICATION_FROM = process.env.NOTIFICATION_FROM || 'AquaCharge <no-reply@aquacharge.local>';
const SMTP_CONFIGURED = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);

const transporter = (() => {
    if (SMTP_CONFIGURED) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER
                ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                }
                : undefined,
        });
    }

    return nodemailer.createTransport({
        jsonTransport: true,
    });
})();

const parseResponseBody = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    return { message: await response.text() };
};

const getUserById = async (userId) => {
    const response = await fetch(`${USER_SERVICE_URL}/users/${encodeURIComponent(String(userId))}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
        throw new Error(data.message || data.error || `Failed to fetch user ${userId} (HTTP ${response.status})`);
    }

    return data;
};

app.post('/notifications/booking-confirmation', async (req, res) => {
    const { user_id, booking } = req.body || {};

    if (!user_id || !booking) {
        return res.status(400).json({ message: 'user_id and booking are required.' });
    }

    try {
        const user = await getUserById(user_id);
        if (!user?.email) {
            return res.status(400).json({ message: 'User email not found for booking notification.' });
        }

        const firstName = user.first_name || 'there';
        const bookingType = booking.type === 'bidirectional' ? 'Bidirectional (V2G)' : 'Regular';

        const mailResult = await transporter.sendMail({
            from: NOTIFICATION_FROM,
            to: user.email,
            subject: `AquaCharge Booking Confirmed (#${booking.id})`,
            text: [
                `Hi ${firstName},`,
                '',
                'Your booking has been confirmed.',
                `Booking ID: ${booking.id}`,
                `Type: ${bookingType}`,
                `Charger ID: ${booking.charger_id}`,
                `Port ID: ${booking.port_id}`,
                `Start: ${booking.start_time}`,
                `End: ${booking.end_time}`,
                '',
                'Thank you for using AquaCharge.',
            ].join('\n'),
            html: `
                <p>Hi ${firstName},</p>
                <p>Your booking has been confirmed.</p>
                <ul>
                    <li><strong>Booking ID:</strong> ${booking.id}</li>
                    <li><strong>Type:</strong> ${bookingType}</li>
                    <li><strong>Charger ID:</strong> ${booking.charger_id}</li>
                    <li><strong>Port ID:</strong> ${booking.port_id}</li>
                    <li><strong>Start:</strong> ${booking.start_time}</li>
                    <li><strong>End:</strong> ${booking.end_time}</li>
                </ul>
                <p>Thank you for using AquaCharge.</p>
            `,
        });

        if (!SMTP_CONFIGURED) {
            console.log('Notification service is running without SMTP config. Email was generated in JSON mode only.');
            console.log('Email preview payload:', mailResult.message);
        } else {
            console.log('Email sent via SMTP:', {
                to: user.email,
                messageId: mailResult.messageId,
            });
        }

        return res.status(200).json({
            message: 'Booking confirmation email queued.',
            messageId: mailResult.messageId,
            preview: mailResult.message,
        });
    } catch (error) {
        console.error('Error sending booking confirmation notification:', error);
        return res.status(500).json({ message: 'Failed to send booking confirmation email.' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
    if (!SMTP_CONFIGURED) {
        console.log('Notification Service started in JSON transport mode (SMTP not configured).');
    }
    console.log(`Notification Service running on port ${PORT}`);
});