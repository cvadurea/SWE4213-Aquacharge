const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3003;

app.listen(PORT, () => {
    console.log(`Booking Service running on port ${PORT}`);
});