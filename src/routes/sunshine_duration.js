const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');
const { formatDate } = require('../utils/formatter');

// =========================
// GET /sunshine_duration
// =========================
router.get('/', async (req, res) => {
    const { sDate, stnId, startDate, endDate } = req.query;

    // Pagination
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 24;
    let offset = (page - 1) * limit;

    // Sorting
    const allowedSortFields = ['sDate', 'stnId', 'sdID'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'sDate';
    const sortOrder = (req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let baseSql = 'FROM sunshine_duration';
    const params = [];
    const conditions = [];

    // =========================
    // Date filtering
    // =========================
    let start = startDate;
    let end = endDate;

    if (!start && !end && !sDate) {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        start = oneMonthAgo.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
    }

    if (sDate) {
        conditions.push('sDate = ?');
        params.push(sDate);
    } else {
        if (start) {
            conditions.push('sDate >= ?');
            params.push(start);
        }
        if (end) {
            conditions.push('sDate <= ?');
            params.push(end);
        }
    }

    if (stnId) {
        conditions.push('stnID = ?');
        params.push(stnId);
    }

    if (conditions.length > 0) {
        baseSql += ' WHERE ' + conditions.join(' AND ');
    }

    try {
        // If date range → return all
        if (startDate && endDate) {
            const [results] = await dbPool.promise().query(
                `SELECT * ${baseSql} ORDER BY ${sortBy} ${sortOrder}`,
                params
            );

            const formattedResults = results.map(row => {
                const newRow = { ...row };
                Object.keys(newRow).forEach(key => {
                    if (newRow[key] instanceof Date) {
                        newRow[key] = formatDate(newRow[key]);
                    }
                });
                return newRow;
            });

            return res.status(200).json({
                message: "Successfully retrieved sunshine duration data (date range)",
                pagination: null,
                filters: { startDate: start, endDate: end },
                sorting: { sortBy, sortOrder },
                results: formattedResults
            });
        }

        // Normal paginated query
        const [countResult] = await dbPool.promise().query(
            `SELECT COUNT(*) as total ${baseSql}`,
            params
        );
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        const [results] = await dbPool.promise().query(
            `SELECT * ${baseSql} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const formattedResults = results.map(row => {
            const newRow = { ...row };
            Object.keys(newRow).forEach(key => {
                if (newRow[key] instanceof Date) {
                    newRow[key] = formatDate(newRow[key]);
                }
            });
            return newRow;
        });

        res.status(200).json({
            message: "Successfully retrieved sunshine duration data",
            pagination: { total, totalPages, currentPage: page, limit },
            filters: { sDate: sDate || null, startDate: start || null, endDate: end || null, stnId: stnId || null },
            sorting: { sortBy, sortOrder },
            results: formattedResults
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// =========================
// POST /sunshine_duration
// =========================
router.post('/', async (req, res) => {
    const body = req.body;

    if (!body.stnID || !body.sDate) {
        return res.status(400).json({ error: 'stnID and sDate are required' });
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

    const sql = `INSERT INTO sunshine_duration (${columns.join(',')}) VALUES (${placeholders.join(',')})`;

    try {
        const [result] = await dbPool.promise().query(sql, values);
        res.status(201).json({ message: 'Sunshine duration created successfully', insertedId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =========================
// PUT /sunshine_duration
// =========================
router.put('/', async (req, res) => {
    const { stnID, sDate, ...rest } = req.body;

    if (!stnID || !sDate) {
        return res.status(400).json({ error: 'stnID and sDate are required to update' });
    }

    const updates = [];
    const values = [];

    Object.entries(rest).forEach(([key, value]) => {
        updates.push(`${key} = ?`);
        values.push(value);
    });

    if (updates.length === 0) return res.status(400).json({ error: 'No fields provided for update' });

    const sql = `UPDATE sunshine_duration SET ${updates.join(',')} WHERE stnID = ? AND sDate = ?`;
    values.push(stnID, sDate);

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'No matching sunshine duration found' });
        res.status(200).json({ message: 'Sunshine duration updated successfully', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =========================
// PATCH /sunshine_duration
// =========================
router.patch('/', async (req, res) => {
    const { stnID, sDate, ...rest } = req.body;

    if (!stnID || !sDate) return res.status(400).json({ error: 'stnID and sDate are required to patch' });

    const updates = [];
    const values = [];

    Object.entries(rest).forEach(([key, value]) => {
        updates.push(`${key} = ?`);
        values.push(value);
    });

    if (updates.length === 0) return res.status(400).json({ error: 'No fields provided for patch' });

    const sql = `UPDATE sunshine_duration SET ${updates.join(',')} WHERE stnID = ? AND sDate = ?`;
    values.push(stnID, sDate);

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'No matching sunshine duration found' });
        res.status(200).json({ message: 'Sunshine duration patched successfully', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =========================
// DELETE /sunshine_duration
// =========================
router.delete('/', async (req, res) => {
    const { stnID, sDate } = req.body;

    if (!stnID || !sDate) return res.status(400).json({ error: 'stnID and sDate are required to delete' });

    const sql = 'DELETE FROM sunshine_duration WHERE stnID = ? AND sDate = ?';
    const values = [stnID, sDate];

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'No matching sunshine duration found' });
        res.status(200).json({ message: 'Sunshine duration deleted successfully', result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;