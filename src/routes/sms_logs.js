const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');


// =====================================================
// GET ALL (with filters)
// =====================================================
// =====================================================
// GET ALL (Filters + Search + Pagination + Sorting)
// =====================================================
router.get('/', async (req, res) => {

    const {
        stnId,
        status,
        category,
        recip,        // search (name OR number)
        dateFrom,
        dateTo
    } = req.query;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Sorting (whitelist)
    const validSortColumns = [
        "dateSent",
        "status",
        "recip_num",
        "recip_name",
        "stnId",
        "category"
    ];

    const sortBy = validSortColumns.includes(req.query.sortBy)
        ? req.query.sortBy
        : "dateSent";

    const sortOrder =
        (req.query.sortOrder || "desc").toLowerCase() === "asc"
            ? "ASC"
            : "DESC";

    let baseSql = `
        FROM sms_logs
        LEFT JOIN stations ON sms_logs.stnId = stations.Id
        WHERE 1=1
    `;

    const values = [];
    const conditions = [];

    // Filters
    if (stnId) {
        conditions.push("sms_logs.stnId = ?");
        values.push(stnId);
    }

    if (status) {
        conditions.push("status = ?");
        values.push(status);
    }

    if (category) {
        conditions.push("category = ?");
        values.push(category);
    }

    // 🔥 Search (recip = name OR number)
    if (recip) {
        conditions.push("(recip_num LIKE ? OR recip_name LIKE ?)");
        values.push(`%${recip}%`, `%${recip}%`);
    }

    // 🔥 Date range
    if (dateFrom) {
        conditions.push("DATE(dateSent) >= DATE(?)");
        values.push(dateFrom);
    }

    if (dateTo) {
        conditions.push("DATE(dateSent) <= DATE(?)");
        values.push(dateTo);
    }

    if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
    }

    try {

        // 1️⃣ Count Query
        const [countResult] = await dbPool.promise().query(
            `SELECT COUNT(*) as total ${baseSql}`,
            values
        );

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // 2️⃣ Data Query
        const [results] = await dbPool.promise().query(
            `SELECT
                smsId,
                sms_logs.stnId,
                uId,
                category,
                status,
                msg,
                recip_num,
                recip_name,
                dateSent,
                channel,
                stations.stnName,
                stations.ICAO
             ${baseSql}
             ORDER BY ${sortBy} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );

        res.status(200).json({
            message: "Successfully retrieved SMS logs",
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit
            },
            filters: {
                stnId: stnId || null,
                status: status || null,
                category: category || null,
                recip: recip || null,
                dateFrom: dateFrom || null,
                dateTo: dateTo || null
            },
            sorting: {
                sortBy,
                sortOrder
            },
            results
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
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