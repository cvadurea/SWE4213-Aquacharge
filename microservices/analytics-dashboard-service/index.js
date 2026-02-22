const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = 3001;

app.listen(PORT, () => {
    console.log(`Analytics Dashboard Service running on port ${PORT}`);
});