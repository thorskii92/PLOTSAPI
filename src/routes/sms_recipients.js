const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

// =====================================================
// GET ALL
// =====================================================
router.get('/', (req, res) => {
    const sql = `
        SELECT sr.*, s.stnName, c.cName AS categoryName
        FROM sms_recipients sr
        LEFT JOIN stations s ON sr.stnId = s.Id
        LEFT JOIN category c ON sr.cID = c.cID
        ORDER BY sr.date_added DESC
    `;

    dbPool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Successfully retrieved SMS recipients", results });
    });
});

// =====================================================
// GET BY ID
// =====================================================
router.get('/:id', (req, res) => {
    const sql = `SELECT * FROM sms_recipients WHERE recipId = ?`;
    dbPool.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "Recipient not found" });
        res.status(200).json({ message: "Recipient retrieved successfully", results: results[0] });
    });
});

// =====================================================
// CREATE / UPSERT
// =====================================================
router.post('/', (req, res) => {
    const { stnId, uId, cID, cName, num, name } = req.body;

    if (!stnId || !num) return res.status(400).json({ error: "stnId and num are required" });

    const getCategorySql = `SELECT cID FROM category WHERE cID = ? OR cName = ? LIMIT 1`;

    // Resolve cID from cName if provided
    dbPool.query(getCategorySql, [cID || null, cName || null], (err, catResults) => {
        if (err) return res.status(500).json({ error: err.message });

        const resolvedCID = catResults.length > 0 ? catResults[0].cID : null;

        // Check if recipient already exists
        const checkSql = `SELECT recipId FROM sms_recipients WHERE num = ? AND (cID <=> ?) AND (name <=> ?) LIMIT 1`;
        dbPool.query(checkSql, [num, resolvedCID, name || null], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            // UPSERT: exists → UPDATE
            if (results.length > 0) {
                const recipId = results[0].recipId;
                const updateSql = `
                    UPDATE sms_recipients
                    SET stnId = ?, uId = ?, cID = ?, num = ?, name = ?, date_updated = NOW()
                    WHERE recipId = ?
                `;
                return dbPool.query(updateSql, [stnId, uId || null, resolvedCID, num, name || null, recipId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    return res.status(200).json({ message: "SMS recipient updated (upsert)", recipId });
                });
            }

            // ELSE → INSERT
            const insertSql = `INSERT INTO sms_recipients (stnId, uId, cID, num, name) VALUES (?, ?, ?, ?, ?)`;
            dbPool.query(insertSql, [stnId, uId || null, resolvedCID, num, name || null], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: "SMS recipient created", recipId: result.insertId });
            });
        });
    });
});

// =====================================================
// FULL UPDATE
// =====================================================
router.put('/:id', (req, res) => {
    const { stnId, uId, cID, cName, num, name } = req.body;
    if (!stnId || !num) return res.status(400).json({ error: "stnId and num are required" });

    const getCategorySql = `SELECT cID FROM category WHERE cID = ? OR cName = ? LIMIT 1`;
    dbPool.query(getCategorySql, [cID || null, cName || null], (err, catResults) => {
        if (err) return res.status(500).json({ error: err.message });
        const resolvedCID = catResults.length > 0 ? catResults[0].cID : null;

        const sql = `
            UPDATE sms_recipients
            SET stnId = ?, uId = ?, cID = ?, num = ?, name = ?, date_updated = NOW()
            WHERE recipId = ?
        `;
        dbPool.query(sql, [stnId, uId || null, resolvedCID, num, name || null, req.params.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Recipient not found" });
            res.status(200).json({ message: "SMS recipient updated successfully" });
        });
    });
});

// =====================================================
// PARTIAL UPDATE
// =====================================================
router.patch('/:id', (req, res) => {
    const body = req.body;
    if (!Object.keys(body).length) return res.status(400).json({ error: "No fields provided for update" });

    const updates = [];
    const values = [];

    // Resolve cName to cID if present
    if (body.cName) {
        const getCategorySql = `SELECT cID FROM category WHERE cName = ? LIMIT 1`;
        return dbPool.query(getCategorySql, [body.cName], (err, catResults) => {
            if (err) return res.status(500).json({ error: err.message });
            body.cID = catResults.length > 0 ? catResults[0].cID : null;
            delete body.cName; // remove cName after resolution
            proceedPatch();
        });
    } else {
        proceedPatch();
    }

    function proceedPatch() {
        Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        });
        updates.push(`date_updated = NOW()`);
        const sql = `UPDATE sms_recipients SET ${updates.join(', ')} WHERE recipId = ?`;
        values.push(req.params.id);

        dbPool.query(sql, values, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Recipient not found" });
            res.status(200).json({ message: "SMS recipient patched successfully" });
        });
    }
});

// =====================================================
// DELETE
// =====================================================
router.delete('/', (req, res) => {
    const { num, cID, cName, name } = req.body;
    if (!num) return res.status(400).json({ error: "num is required" });

    const getCategorySql = `SELECT cID FROM category WHERE cID = ? OR cName = ? LIMIT 1`;
    dbPool.query(getCategorySql, [cID || null, cName || null], (err, catResults) => {
        if (err) return res.status(500).json({ error: err.message });
        const resolvedCID = catResults.length > 0 ? catResults[0].cID : null;

        const sql = `DELETE FROM sms_recipients WHERE num = ? AND (cID <=> ?) AND (name <=> ?)`;
        dbPool.query(sql, [num, resolvedCID, name || null], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ message: "Recipient deleted", affectedRows: result.affectedRows });
        });
    });
});

module.exports = router;