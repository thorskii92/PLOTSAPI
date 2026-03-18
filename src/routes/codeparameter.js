const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

// GET all
router.get('/', (req, res) => {
    dbPool.query("SELECT * FROM codeparameter", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// CREATE
router.post('/', (req, res) => {
    const { stnID, uID, cID, varname, var: variable, par } = req.body;

    const sql = `
        INSERT INTO codeparameter 
        (stnID, uID, cID, varname, var, par)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    dbPool.query(
        sql,
        [stnID, uID, cID, varname, variable, par],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "Code parameter created" });
        }
    );
});

// UPDATE
router.put('/:id', (req, res) => {
    const { varname, var: variable, par } = req.body;

    dbPool.query(
        `UPDATE codeparameter 
         SET varname=?, var=?, par=?, dateupdated=NOW()
         WHERE paraID=?`,
        [varname, variable, par, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated successfully" });
        }
    );
});

// DELETE
router.delete('/:id', (req, res) => {
    dbPool.query(
        "DELETE FROM codeparameter WHERE paraID=?",
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted successfully" });
        }
    );
});

module.exports = router;