const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

const REQUIRED_FIELDS = ['wmoID', 'stationID', 'stnName'];

// GET all stations
router.get('/', (req, res) => {
    dbPool.query("SELECT * FROM stations", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }
        res.status(200).json({ message: "Successfully retrieved stations data", results: results });
    });
})

// GET station by ID
router.get('/:id', (req, res) => {
    const stationId = req.params.id;

    dbPool.query("SELECT * FROM stations WHERE id = ?", [stationId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }
        res.status(200).json({ message: `Successfully retrieved data for station ID: ${stationId}`, results: results });
    });
});

// Create new station
router.post('/', (req, res) => {
    const body = req.body;

    console.log('Received POST body:', body);

    for (const field of REQUIRED_FIELDS) {
        if (!body[field]) {
            return res.status(400).json({
                error: `Missing required field: ${field}`
            });
        }
    }

    const columns = [];
    const placeholders = [];
    const values = [];

    Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined) {
            columns.push(key);
            placeholders.push('?');
            values.push(value);
        }
    });

    const sql = `
        INSERT INTO stations (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
    `;

    dbPool.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            message: 'Station created successfully',
            result: result
        });
    });
});

// Update station by ID
router.put('/:id', (req, res) => {
    const stationId = req.params.id;
    const body = req.body;

    if (!Object.keys(body).length) {
        return res.status(400).json({
            error: 'No fields provided for update'
        });
    }

    const updates = [];
    const values = [];

    Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
    });

    const sql = `
        UPDATE stations
        SET ${updates.join(', ')}
        WHERE Id = ?
    `;

    values.push(stationId);

    dbPool.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Station not found' });
        }

        res.status(200).json({
            message: `Station ID ${stationId} updated successfully`
        });
    });
});

// Partial update station by ID
router.patch('/:id', (req, res) => {
    const stationId = req.params.id;
    const body = req.body;

    if (!Object.keys(body).length) {
        return res.status(400).json({
            error: 'No fields provided for update'
        });
    }

    const updates = [];
    const values = [];

    Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
    });

    if (!updates.length) {
        return res.status(400).json({
            error: 'No valid fields provided for update'
        });
    }

    const sql = `
        UPDATE stations
        SET ${updates.join(', ')}
        WHERE Id = ?
    `;

    values.push(stationId);

    dbPool.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Station not found' });
        }

        res.status(200).json({
            message: `Station ID ${stationId} patched successfully`
        });
    });
});

// Delete station by ID
router.delete('/:id', (req, res) => {
    const stationId = req.params.id;

    const sql = 'DELETE FROM stations WHERE Id = ?';

    dbPool.query(sql, [stationId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Station not found' });
        }

        res.status(200).json({
            message: `Station ID ${stationId} deleted successfully`
        });
    });
});


module.exports = router;