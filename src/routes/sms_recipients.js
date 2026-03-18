const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');


// =====================================================
// GET ALL
// =====================================================
router.get('/', (req, res) => {
    const sql = `
        SELECT sr.*, s.stnName, c.cName
        FROM sms_recipients sr
        LEFT JOIN stations s ON sr.stnId = s.Id
        LEFT JOIN category c ON sr.cID = c.cID
        ORDER BY sr.date_added DESC
    `;

    dbPool.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(200).json({
            message: "Successfully retrieved SMS recipients",
            results
        });
    });
});


// =====================================================
// GET BY ID
// =====================================================
router.get('/:id', (req, res) => {
    const sql = `
        SELECT * FROM sms_recipients
        WHERE recipId = ?
    `;

    dbPool.query(sql, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Recipient not found"
            });
        }

        res.status(200).json({
            message: "Recipient retrieved successfully",
            results
        });
    });
});


// =====================================================
// CREATE
// =====================================================
router.post('/', (req, res) => {
    const { stnId, uId, cID, num, name } = req.body;

    if (!stnId || !num) {
        return res.status(400).json({
            error: "stnId and num are required"
        });
    }

    const sql = `
        INSERT INTO sms_recipients
        (stnId, uId, cID, num, name)
        VALUES (?, ?, ?, ?, ?)
    `;

    dbPool.query(
        sql,
        [stnId, uId || null, cID || null, num, name || null],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: "SMS recipient created successfully",
                recipId: result.insertId
            });
        }
    );
});


// =====================================================
// UPDATE (FULL UPDATE)
// =====================================================
router.put('/:id', (req, res) => {
    const { stnId, uId, cID, num, name } = req.body;

    if (!stnId || !num) {
        return res.status(400).json({
            error: "stnId and num are required"
        });
    }

    const sql = `
        UPDATE sms_recipients
        SET stnId = ?,
            uId = ?,
            cID = ?,
            num = ?,
            name = ?,
            date_updated = NOW()
        WHERE recipId = ?
    `;

    dbPool.query(
        sql,
        [stnId, uId || null, cID || null, num, name || null, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Recipient not found"
                });
            }

            res.status(200).json({
                message: "SMS recipient updated successfully"
            });
        }
    );
});


// =====================================================
// PARTIAL UPDATE
// =====================================================
router.patch('/:id', (req, res) => {
    const body = req.body;

    if (!Object.keys(body).length) {
        return res.status(400).json({
            error: "No fields provided for update"
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

    updates.push(`date_updated = NOW()`);

    const sql = `
        UPDATE sms_recipients
        SET ${updates.join(', ')}
        WHERE recipId = ?
    `;

    values.push(req.params.id);

    dbPool.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Recipient not found"
            });
        }

        res.status(200).json({
            message: "SMS recipient patched successfully"
        });
    });
});


// =====================================================
// DELETE
// =====================================================
router.delete('/:id', (req, res) => {
    const sql = `
        DELETE FROM sms_recipients
        WHERE recipId = ?
    `;

    dbPool.query(sql, [req.params.id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Recipient not found"
            });
        }

        res.status(200).json({
            message: "SMS recipient deleted successfully"
        });
    });
});


module.exports = router;