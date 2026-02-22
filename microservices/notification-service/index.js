const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3005;

app.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
});