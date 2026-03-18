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
// UPDATE (PUT)
// ==========================
router.put('/:id', (req, res) => {
    const id = req.params.id;
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
        UPDATE codetemplate
        SET ${updates.join(', ')},
            dateupdated = datetime('now')
        WHERE codeID = ?
    `;

    values.push(id);

    dbPool.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Code template not found' });
        }

        res.status(200).json({
            message: `Code template ID ${id} updated successfully`
        });
    });
});


// ==========================
// DELETE
// ==========================
router.delete('/:id', (req, res) => {
    const id = req.params.id;

    dbPool.query(
        "DELETE FROM codetemplate WHERE codeID = ?",
        [id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Code template not found' });
            }

            res.status(200).json({
                message: `Code template ID ${id} deleted successfully`
            });
        }
    );
});

module.exports = router;