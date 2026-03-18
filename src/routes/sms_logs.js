const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');


// =====================================================
// GET ALL (with filters)
// =====================================================
router.get('/', (req, res) => {

    const { stnId, category, status, limit = 100 } = req.query;

    let sql = `
        SELECT *
        FROM sms_logs
        WHERE 1=1
    `;

    const values = [];

    if (stnId) {
        sql += " AND stnId = ?";
        values.push(stnId);
    }

    if (category) {
        sql += " AND category = ?";
        values.push(category);
    }

    if (status) {
        sql += " AND status = ?";
        values.push(status);
    }

    sql += " ORDER BY dateSent DESC LIMIT ?";
    values.push(parseInt(limit));

    dbPool.query(sql, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(200).json({
            message: "Successfully retrieved SMS logs",
            results
        });
    });
});


// =====================================================
// GET BY ID
// =====================================================
router.get('/:id', (req, res) => {

    dbPool.query(
        "SELECT * FROM sms_logs WHERE smsId = ?",
        [req.params.id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "SMS log not found"
                });
            }

            res.status(200).json({
                message: "SMS log retrieved successfully",
                results
            });
        }
    );
});


// =====================================================
// CREATE LOG (Usually called after sending SMS)
// =====================================================
router.post('/', (req, res) => {

    const {
        stnId,
        uId,
        category,
        status,
        msg,
        recip_num,
        recip_name,
        channel
    } = req.body;

    if (!category || !status || !msg || !recip_num) {
        return res.status(400).json({
            error: "category, status, msg, and recip_num are required"
        });
    }

    const sql = `
        INSERT INTO sms_logs
        (stnId, uId, category, status, msg, recip_num, recip_name, channel)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    dbPool.query(
        sql,
        [
            stnId || null,
            uId || null,
            category,
            status,
            msg,
            recip_num,
            recip_name || null,
            channel || 'skyobs'
        ],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: "SMS log created successfully",
                smsId: result.insertId
            });
        }
    );
});


// =====================================================
// DELETE (Optional – usually restricted)
// =====================================================
router.delete('/:id', (req, res) => {

    dbPool.query(
        "DELETE FROM sms_logs WHERE smsId = ?",
        [req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "SMS log not found"
                });
            }

            res.status(200).json({
                message: "SMS log deleted successfully"
            });
        }
    );
});


module.exports = router;