const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3007;

app.listen(PORT, () => {
    console.log(`User Management Service running on port ${PORT}`);
});