const express = require('express');
const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// Import routes
const psychrometric = require('./src/routes/psychrometric');
const stations = require('./src/routes/stations');
const synop_data = require('./src/routes/synop_data');
const systemusers = require('./src/routes/systemusers');

app.get('/', (req, res) => {
    res.send('PLOTS!');
});

// Basic middleware to parse JSON bodies
app.use(express.json())

// Use routes
app.use("/api/psychrometric", psychrometric);
app.use("/api/stations", stations);
app.use("/api/synop_data", synop_data);
app.use("/api/systemusers", systemusers);
