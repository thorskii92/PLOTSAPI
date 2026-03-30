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
const codetemplate = require('./src/routes/codetemplate');
const codeparameter = require('./src/routes/codeparameter');
const sms_logs = require('./src/routes/sms_logs');
const sms_recipients = require('./src/routes/sms_recipients');
const aerodrome = require('./src/routes/aerodrome');
const category = require('./src/routes/category');
const health = require('./src/routes/health');
const sunshine_duration = require('./src/routes/sunshine_duration');

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
app.use("/api/category", category);
app.use("/api/codetemplate", codetemplate);
app.use("/api/codeparameter", codeparameter);
app.use("/api/sms_recipients", sms_recipients);
app.use("/api/sms_logs", sms_logs);
app.use("/api/aerodrome", aerodrome);
app.use("/api/health", health);
app.use("/api/sunshine_duration", sunshine_duration);
