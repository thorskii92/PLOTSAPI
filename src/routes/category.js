const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');


// =====================================================
// GET ALL
// GET /api/category
// =====================================================
router.get('/', (req, res) => {

    const sql = `
        SELECT *
        FROM category
        ORDER BY date_created DESC
    `;

    dbPool.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    });
});


// =====================================================
// GET BY ID
// GET /api/category/:id
// =====================================================
router.get('/:id', (req, res) => {

    dbPool.query(
        "SELECT * FROM category WHERE cID = ?",
        [req.params.id],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            res.status(200).json({
                success: true,
                data: results[0]
            });
        }
    );
});


// =====================================================
// CREATE
// POST /api/category
// =====================================================
router.post('/', (req, res) => {

    const { stnID, cName } = req.body;

    if (!stnID || !cName) {
        return res.status(400).json({
            success: false,
            message: "stnID and cName are required"
        });
    }

    const sql = `
        INSERT INTO category (stnID, cName)
        VALUES (?, ?)
    `;

    dbPool.query(sql, [stnID, cName], (err, result) => {

        if (err) {

            // Handle UNIQUE constraint error
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: "Category already exists for this station"
                });
            }

            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: {
                cID: result.insertId,
                stnID,
                cName
            }
        });
    });
});


// =====================================================
// UPDATE (PUT)
// PUT /api/category/:id
// =====================================================
router.put('/:id', (req, res) => {

    const { stnID, cName } = req.body;

    if (!stnID || !cName) {
        return res.status(400).json({
            success: false,
            message: "stnID and cName are required"
        });
    }

    const sql = `
        UPDATE category
        SET stnID = ?,
            cName = ?,
            date_updated = NOW()
        WHERE cID = ?
    `;

    dbPool.query(sql,
        [stnID, cName, req.params.id],
        (err, result) => {

            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        message: "Duplicate category for this station"
                    });
                }

                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Category updated successfully"
            });
        }
    );
});


// =====================================================
// DELETE
// DELETE /api/category/:id
// =====================================================
router.delete('/:id', (req, res) => {

    dbPool.query(
        "DELETE FROM category WHERE cID = ?",
        [req.params.id],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Category deleted successfully"
            });
        }
    );
});

module.exports = router;