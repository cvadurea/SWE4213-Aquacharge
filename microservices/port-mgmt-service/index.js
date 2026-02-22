const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3006;

app.listen(PORT, () => {
    console.log(`Port Management Service running on port ${PORT}`);
});