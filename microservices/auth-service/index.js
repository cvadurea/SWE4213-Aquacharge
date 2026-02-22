const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3002;

app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});