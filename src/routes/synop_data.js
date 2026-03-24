const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');

// GET /synop_data
// Examples:
// /synop_data
// /synop_data?startDate=2026-02-01&endDate=2026-02-28
// /synop_data?sDate=2026-03-18

router.get('/', async (req, res) => {
    const { sDate, sHour, stnId, startDate, endDate } = req.query;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const offset = (page - 1) * limit;

    // Sorting (whitelist for security)
    const allowedSortFields = ['sDate', 'sHour', 'stnId'];
    const sortBy = allowedSortFields.includes(req.query.sortBy)
        ? req.query.sortBy
        : 'sDate';

    const sortOrder =
        (req.query.sortOrder || 'desc').toLowerCase() === 'asc'
            ? 'ASC'
            : 'DESC';

    let baseSql = 'FROM synop_data';
    const params = [];
    const conditions = [];

    // =========================
    // DATE FILTER LOGIC
    // =========================
    let start = startDate;
    let end = endDate;

    // Default to last 1 month if no date filters provided
    if (!start && !end && !sDate) {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);

        start = oneMonthAgo.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
    }

    // Exact date (priority)
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

    // Other filters
    if (sHour) {
        conditions.push('sHour = ?');
        params.push(sHour);
    }

    if (stnId) {
        conditions.push('stnId = ?');
        params.push(stnId);
    }

    if (conditions.length > 0) {
        baseSql += ' WHERE ' + conditions.join(' AND ');
    }

    try {
        // Total count
        const [countResult] = await dbPool.promise().query(
            `SELECT COUNT(*) as total ${baseSql}`,
            params
        );

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // Data query
        const [results] = await dbPool.promise().query(
            `SELECT * ${baseSql}
             ORDER BY ${sortBy} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.status(200).json({
            message: "Successfully retrieved synoptic data",
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit
            },
            filters: {
                sDate: sDate || null,
                startDate: start || null,
                endDate: end || null,
                sHour: sHour || null,
                stnId: stnId || null
            },
            sorting: {
                sortBy,
                sortOrder
            },
            results
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /synop_data
router.post('/', async (req, res) => {
    const body = req.body;

    if (!body.stnId || !body.sDate || !body.sHour) {
        return res.status(400).json({ error: 'stnId, sDate, and sHour are required' });
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
// Full update: requires stnId, sDate, sHour as identifier
router.put('/', async (req, res) => {
    console.log(req.body)
    const { stnId, sDate, sHour, ...rest } = req.body;

    if (!stnId || !sDate || !sHour) {
        return res.status(400).json({ error: 'stnId, sDate, and sHour are required to update' });
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
        WHERE stnId = ? AND sDate = ? AND sHour = ?
    `;
    values.push(stnId, sDate, sHour);

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
// Partial update: requires stnId, sDate, sHour to identify, updates only provided fields
router.patch('/', async (req, res) => {
    const { stnId, sDate, sHour, ...rest } = req.body;

    if (!stnId || !sDate || !sHour) {
        return res.status(400).json({ error: 'stnId, sDate, and sHour are required to patch' });
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
        WHERE stnId = ? AND sDate = ? AND sHour = ?
    `;
    values.push(stnId, sDate, sHour);

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
// Requires stnId, sDate, sHour to identify
router.delete('/', async (req, res) => {
    const { stnId, sDate, sHour } = req.body;

    if (!stnId || !sDate || !sHour) {
        return res.status(400).json({ error: 'stnId, sDate, and sHour are required to delete' });
    }

    const sql = 'DELETE FROM synop_data WHERE stnId = ? AND sDate = ? AND sHour = ?';
    const values = [stnId, sDate, sHour];

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
