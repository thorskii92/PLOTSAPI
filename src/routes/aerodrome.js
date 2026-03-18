const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');


// =====================================================
// GET ALL (with filters + pagination)
// =====================================================
router.get('/', async (req, res) => {

    const {
        stnID,
        MorS,
        sDate
    } = req.query;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Sorting (whitelist for safety)
    const allowedSortFields = [
        'sDate',
        'sHour',
        'stnID',
        'metID'
    ];

    const sortBy = allowedSortFields.includes(req.query.sortBy)
        ? req.query.sortBy
        : 'sDate';

    const sortOrder =
        (req.query.sortOrder || 'desc').toLowerCase() === 'asc'
            ? 'ASC'
            : 'DESC';

    let baseSql = `
        FROM aerodrome a
        LEFT JOIN stations s ON a.stnID = s.Id
        LEFT JOIN users u ON a.uID = u.Id
        WHERE 1=1
    `;

    const values = [];
    const conditions = [];

    // Filters
    if (stnID) {
        conditions.push("a.stnID = ?");
        values.push(stnID);
    }

    if (MorS) {
        conditions.push("a.MorS = ?");
        values.push(MorS);
    }

    if (sDate) {
        conditions.push("a.sDate = ?");
        values.push(sDate);
    }

    if (conditions.length > 0) {
        baseSql += " AND " + conditions.join(" AND ");
    }

    try {

        // 1️⃣ Get total count
        const [countResult] = await dbPool.promise().query(
            `SELECT COUNT(*) as total ${baseSql}`,
            values
        );

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // 2️⃣ Get paginated + sorted data
        const [results] = await dbPool.promise().query(
            `SELECT a.*, s.stnName, u.username
             ${baseSql}
             ORDER BY a.${sortBy} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );

        res.status(200).json({
            message: "Successfully retrieved aerodrome records",
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit
            },
            filters: {
                stnID: stnID || null,
                MorS: MorS || null,
                sDate: sDate || null
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
        "SELECT * FROM aerodrome WHERE metID = ?",
        [req.params.id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Aerodrome record not found"
                });
            }

            res.status(200).json({
                message: "Aerodrome record retrieved successfully",
                results
            });
        }
    );
});


// =====================================================
// CREATE
// =====================================================
router.post('/', (req, res) => {

    const {
        stnID,
        uID,
        MorS,
        sDate,
        sHour,
        SurfaceWind,
        PresVV,
        PresWx,
        Cloud1,
        Cloud2,
        Cloud3,
        Cloud4,
        Tem,
        Dew,
        AltPres,
        Supplemental,
        Remarks,
        Signature,
        ATS
    } = req.body;

    if (!stnID || !MorS || !sDate || !sHour) {
        return res.status(400).json({
            error: "stnID, MorS, sDate, and sHour are required"
        });
    }

    const sql = `
        INSERT INTO aerodrome
        (stnID, uID, MorS, sDate, sHour,
         SurfaceWind, PresVV, PresWx,
         Cloud1, Cloud2, Cloud3, Cloud4,
         Tem, Dew, AltPres,
         Supplemental, Remarks,
         Signature, ATS)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    dbPool.query(sql,
        [
            stnID,
            uID || null,
            MorS,
            sDate,
            sHour,
            SurfaceWind || null,
            PresVV || null,
            PresWx || null,
            Cloud1 || null,
            Cloud2 || null,
            Cloud3 || null,
            Cloud4 || null,
            Tem || null,
            Dew || null,
            AltPres || null,
            Supplemental || null,
            Remarks || null,
            Signature || null,
            ATS || null
        ],
        (err, result) => {

            if (err) {
                // Handle duplicate UNIQUE error
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        error: "Aerodrome record already exists for this station, date, and hour"
                    });
                }

                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: "Aerodrome record created successfully",
                metID: result.insertId
            });
        }
    );
});


// =====================================================
// UPDATE
// =====================================================
router.put('/:id', (req, res) => {

    const {
        SurfaceWind,
        PresVV,
        PresWx,
        Cloud1,
        Cloud2,
        Cloud3,
        Cloud4,
        Tem,
        Dew,
        AltPres,
        Supplemental,
        Remarks,
        Signature,
        ATS
    } = req.body;

    const sql = `
        UPDATE aerodrome
        SET
            SurfaceWind=?,
            PresVV=?,
            PresWx=?,
            Cloud1=?,
            Cloud2=?,
            Cloud3=?,
            Cloud4=?,
            Tem=?,
            Dew=?,
            AltPres=?,
            Supplemental=?,
            Remarks=?,
            Signature=?,
            ATS=?,
            date_updated=NOW()
        WHERE metID=?
    `;

    dbPool.query(sql,
        [
            SurfaceWind || null,
            PresVV || null,
            PresWx || null,
            Cloud1 || null,
            Cloud2 || null,
            Cloud3 || null,
            Cloud4 || null,
            Tem || null,
            Dew || null,
            AltPres || null,
            Supplemental || null,
            Remarks || null,
            Signature || null,
            ATS || null,
            req.params.id
        ],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Aerodrome record not found"
                });
            }

            res.status(200).json({
                message: "Aerodrome record updated successfully"
            });
        }
    );
});


// =====================================================
// DELETE
// =====================================================
router.delete('/:id', (req, res) => {

    dbPool.query(
        "DELETE FROM aerodrome WHERE metID = ?",
        [req.params.id],
        (err, result) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Aerodrome record not found"
                });
            }

            res.status(200).json({
                message: "Aerodrome record deleted successfully"
            });
        }
    );
});

module.exports = router;