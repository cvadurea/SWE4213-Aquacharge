const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3004;

app.listen(PORT, () => {
    console.log(`Fleet Management Service running on port ${PORT}`);
});