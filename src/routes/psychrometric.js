const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

// Get psychrometric data (optional filters: dBulb, wBulb)
router.get('/', (req, res) => {
    const { dBulb, wBulb } = req.query;

    let sql = `SELECT * FROM psychrometric`;
    let conditions = [];
    let params = [];

    if (dBulb) {
        conditions.push('dBulb = ?');
        params.push(dBulb);
    }
    if (wBulb) {
        conditions.push('wBulb = ?');
        params.push(wBulb);
    }

    if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    console.log('Executing SQL:', sql, 'with params:', params);

    dbPool.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ message: "Successfully retrieved psychrometric data", results: results });
    });
});

// Create new psychrometric data
router.post('/', async (req, res) => {
    const body = req.body;

    if (!body.dBulb && !body.wBulb) {
        return res.status(400).json({ error: 'Missing required fields: dBulb and wBulb' });
    }

    const { dBulb, wBulb, dPoint, RH, vPressure } = body;

    try {
        const [existingResult] = await dbPool.promise().query(
            `SELECT * FROM psychrometric WHERE dBulb = ? AND wBulb = ?`,
            [dBulb, wBulb]
        );

        if (existingResult.length > 0) {
            return res.status(409).json({ error: 'Psychrometric data with the same dBulb and wBulb already exists' });
        }


        let sql = `INSERT INTO psychrometric (dBulb, wBulb`;;
        let placeholders = `?, ?`;
        let values = [dBulb, wBulb];

        if (dPoint !== undefined && dPoint !== null) {
            sql += `, dPoint`;
            placeholders += `, ?`;
            values.push(dPoint);
        }

        if (RH !== undefined && RH !== null) {
            const RH = RH;
            sql += `, RH`;
            placeholders += `, ?`;
            values.push(RH);
        }

        if (vPressure !== undefined && vPressure !== null) {
            const vPressure = vPressure;
            sql += `, vPressure`;
            placeholders += `, ?`;
            values.push(vPressure);
        }

        sql += `) VALUES (${placeholders})`;

        dbPool.query(sql, values, (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "Successfully inserted psychrometric data", result: result });
        });

    } catch (err) {
        console.error('Error checking existing psychrometric data:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update psychrometric data by dBulb and wBulb
router.put('/', async (req, res) => {
    const body = req.body;

    // All fields are required
    const requiredFields = ['dBulb', 'wBulb', 'dPoint', 'RH', 'vPressure'];
    const missingFields = requiredFields.filter(f => body[f] === undefined || body[f] === null);

    if (missingFields.length > 0) {
        return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    const { dBulb, wBulb, dPoint, RH, vPressure } = body;

    try {
        const sql = `
            UPDATE psychrometric
            SET dPoint = ?, RH = ?, vPressure = ?
            WHERE dBulb = ? AND wBulb = ?
        `;
        const values = [dPoint, RH, vPressure, dBulb, wBulb];

        const [result] = await dbPool.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No matching psychrometric data found to update" });
        }

        res.status(200).json({ message: "Successfully updated psychrometric data", result: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Partial update psychrometric data by dBulb and wBulb
router.patch('/', async (req, res) => {
    const body = req.body;

    // dBulb and wBulb are required to identify the record
    const { dBulb, wBulb, dPoint, RH, vPressure } = body;
    if (dBulb === undefined || wBulb === undefined) {
        return res.status(400).json({ error: 'Missing required fields to identify record: dBulb and wBulb' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (dPoint !== undefined) {
        updates.push('dPoint = ?');
        values.push(dPoint);
    }
    if (RH !== undefined) {
        updates.push('RH = ?');
        values.push(RH);
    }
    if (vPressure !== undefined) {
        updates.push('vPressure = ?');
        values.push(vPressure);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
    }

    const sql = `
        UPDATE psychrometric
        SET ${updates.join(', ')}
        WHERE dBulb = ? AND wBulb = ?
    `;
    values.push(dBulb, wBulb);

    try {
        const [result] = await dbPool.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No matching psychrometric data found to update' });
        }

        res.status(200).json({ message: 'Successfully patched psychrometric data', result: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/', async (req, res) => {
    const { dBulb, wBulb } = req.body;
    if (dBulb === undefined || wBulb === undefined) {
        return res.status(400).json({ error: 'Missing required fields to identify record: dBulb and wBulb' });
    }
    try {
        const sql = `DELETE FROM psychrometric WHERE dBulb = ? AND wBulb = ?`;
        const values = [dBulb, wBulb];
        const [result] = await dbPool.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No matching psychrometric data found to delete' });
        }
        res.status(200).json({ message: 'Successfully deleted psychrometric data', result: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;