const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

// GET /synop_data?date=YYYY-MM-DD&sHour=HHMM
router.get('/', async (req, res) => {
    const { sDate, sHour } = req.query;

    let sql = 'SELECT * FROM synop_data';
    const params = [];
    const conditions = [];

    if (sDate) {
        conditions.push('sDate = ?');
        params.push(sDate); // 'YYYY-MM-DD'
    }

    if (sHour) {
        conditions.push('sHour = ?');
        params.push(sHour);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    try {
        const [results] = await dbPool.promise().query(sql, params);
        res.status(200).json({ message: "Successfully retrieved synoptic data", results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /synop_data
router.post('/', async (req, res) => {
    const body = req.body;

    if (!body.stnID || !body.sDate || !body.sHour) {
        return res.status(400).json({ error: 'stnID, sDate, and sHour are required' });
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

    const sql = `INSERT INTO synop_data (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    try {
        const [result] = await dbPool.promise().query(sql, values);
        res.status(201).json({ message: 'Synop data created successfully', insertedId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /synop_data
// Full update: requires stnID, sDate, sHour as identifier
router.put('/', async (req, res) => {
    const { stnID, sDate, sHour, ...rest } = req.body;

    if (!stnID || !sDate || !sHour) {
        return res.status(400).json({ error: 'stnID, sDate, and sHour are required to update' });
    }

    const updates = [];
    const values = [];

    Object.entries(rest).forEach(([key, value]) => {
        updates.push(`${key} = ?`);
        values.push(value);
    });

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
    }

    const sql = `
        UPDATE synop_data
        SET ${updates.join(', ')}
        WHERE stnID = ? AND sDate = ? AND sHour = ?
    `;
    values.push(stnID, sDate, sHour);

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No matching synop data found' });
        }
        res.status(200).json({ message: 'Synop data updated successfully', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /synop_data
// Partial update: requires stnID, sDate, sHour to identify, updates only provided fields
router.patch('/', async (req, res) => {
    const { stnID, sDate, sHour, ...rest } = req.body;

    if (!stnID || !sDate || !sHour) {
        return res.status(400).json({ error: 'stnID, sDate, and sHour are required to patch' });
    }

    const updates = [];
    const values = [];

    Object.entries(rest).forEach(([key, value]) => {
        updates.push(`${key} = ?`);
        values.push(value);
    });

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided for patch' });
    }

    const sql = `
        UPDATE synop_data
        SET ${updates.join(', ')}
        WHERE stnID = ? AND sDate = ? AND sHour = ?
    `;
    values.push(stnID, sDate, sHour);

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No matching synop data found' });
        }
        res.status(200).json({ message: 'Synop data patched successfully', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /synop_data
// Requires stnID, sDate, sHour to identify
router.delete('/', async (req, res) => {
    const { stnID, sDate, sHour } = req.body;

    if (!stnID || !sDate || !sHour) {
        return res.status(400).json({ error: 'stnID, sDate, and sHour are required to delete' });
    }

    const sql = 'DELETE FROM synop_data WHERE stnID = ? AND sDate = ? AND sHour = ?';
    const values = [stnID, sDate, sHour];

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No matching synop data found' });
        }
        res.status(200).json({ message: 'Synop data deleted successfully', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
