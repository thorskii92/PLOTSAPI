const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

// ==========================
// HEALTH CHECK
// ==========================
router.get('/', (req, res) => {
    dbPool.query('SELECT 1', (err) => {
        if (err) {
            return res.status(500).json({
                status: "ERROR",
                message: "API reachable but database failed",
                db: "disconnected"
            });
        }

        res.status(200).json({
            status: "OK",
            message: "API and database are healthy",
            db: "connected",
            timestamp: new Date().toISOString()
        });
    });
});

router.get('/ping', (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "API reachable"
    });
});

module.exports = router;