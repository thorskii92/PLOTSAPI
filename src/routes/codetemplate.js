const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

/*
codetemplate structure:
codeID (PK)
stnID
cID
hour
uID
Template
tType
dateadded
dateupdated
*/

// ==========================
// GET ALL
// ==========================
router.get('/', (req, res) => {
    dbPool.query("SELECT * FROM codetemplate", (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }

        res.status(200).json({
            message: "Successfully retrieved codetemplate data",
            results
        });
    });
});


// ==========================
// GET BY ID
// ==========================
router.get('/:id', (req, res) => {
    const id = req.params.id;

    dbPool.query(
        "SELECT * FROM codetemplate WHERE codeID = ?",
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query error' });
            }

            res.status(200).json({
                message: `Successfully retrieved code template ID: ${id}`,
                results
            });
        }
    );
});


// ==========================
// CREATE
// ==========================
router.post('/', (req, res) => {
    const body = req.body;

    const requiredFields = ['stnID', 'cID', 'hour', 'tType'];

    for (const field of requiredFields) {
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
        INSERT INTO codetemplate (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
    `;

    dbPool.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            message: 'Code template created successfully',
            result
        });
    });
});


// ==========================
// UPDATE (PUT) based on unique constraint
// ==========================
router.put('/', (req, res) => {
    const { stnID, cID, hour, tType, Template, uID } = req.body;

    // Validate required unique fields
    if (!stnID || !cID || !tType) {
        return res.status(400).json({ error: 'Missing required unique fields: stnID, cID, tType' });
    }

    // Enforce hour for SPECIFIC templates
    if (tType.toLowerCase() === 'specific' && !hour) {
        return res.status(400).json({ error: 'Hour is required for tType "Specific"' });
    }

    const updates = [];
    const values = [];

    if (Template !== undefined) {
        updates.push(`Template = ?`);
        values.push(Template);
    }

    if (uID !== undefined) {
        updates.push(`uID = ?`);
        values.push(uID);
    }

    // Always update dateupdated
    updates.push(`dateupdated = NOW()`);

    // Use hour or NULL if not provided (for General templates)
    const hourValue = hour || null;

    const sql = `
        UPDATE codetemplate
        SET ${updates.join(', ')}
        WHERE stnID = ? AND cID = ? AND hour ${hourValue ? '= ?' : 'IS NULL'} AND tType = ?
    `;

    if (hourValue) values.push(hourValue);
    values.push(stnID, cID, tType);

    dbPool.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.affectedRows === 0) {
            // Insert if not exists
            const insertSql = `
                INSERT INTO codetemplate (stnID, cID, hour, tType, Template, uID, dateadded, dateupdated)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            dbPool.query(
                insertSql,
                [stnID, cID, hourValue, tType, Template, uID],
                (insertErr, insertResult) => {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });
                    return res.status(201).json({
                        message: 'Template created (did not exist before)',
                        result: insertResult
                    });
                }
            );
        } else {
            res.status(200).json({ message: 'Template updated successfully' });
        }
    });
});

// ==========================
// DELETE based on unique constraint
// ==========================
router.delete('/', (req, res) => {
    const { stnID, tType, hour } = req.body;

    if (!stnID || !tType) {
        return res.status(400).json({
            error: 'Missing required unique fields: stnID and tType are required'
        });
    }

    // Use NULL-safe comparison for hour
    const sql = `
        DELETE FROM codetemplate
        WHERE stnID = ?
          AND tType = ?
          AND (hour = ? OR (hour IS NULL AND ? IS NULL))
    `;

    dbPool.query(sql, [stnID, tType, hour, hour], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Code template not found for the given unique combination'
            });
        }

        res.status(200).json({
            message: `Code template deleted successfully for stnID=${stnID}, tType=${tType}, hour=${hour}`
        });
    });
});

module.exports = router;