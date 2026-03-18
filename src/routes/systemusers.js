const express = require('express');
const router = express.Router();
const { dbPool } = require('../connect');
const { encrypt, decrypt } = require('../utils/crypto')

router.get('/testAuth', (req, res) => {
    const encrypted = encrypt("uzzi")
    res.status(200).send(encrypted);
})

// GET all users
router.get('/', async (req, res) => {
    try {
        const [results] = await dbPool.promise().query("SELECT * FROM systemusers");
        res.status(200).json({ message: "Successfully retrieved system users", results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query error' });
    }
});

// GET user by ID
router.get('/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [results] = await dbPool.promise().query("SELECT * FROM systemusers WHERE Id = ?", [userId]);

        res.status(200).json({ message: `Successfully retrieved data for user ID: ${userId}`, results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query error' });
    }
});

// POST - create new user
router.post('/', async (req, res) => {
    const body = req.body;

    // required fields
    const REQUIRED_FIELDS = ['sUser', 'sPass', 'fullName'];
    for (const field of REQUIRED_FIELDS) {
        if (!body[field]) {
            return res.status(400).json({ error: `Missing required field: ${field}` });
        }
    }

    body.sPass = encrypt(body.sPass);
    body.sUser = encrypt(body.sUser);

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

    const sql = `INSERT INTO systemusers (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    try {
        const [result] = await dbPool.promise().query(sql, values);
        res.status(201).json({ message: "User created successfully", insertedId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT - full update (all fields required except Id)
router.put('/:id', async (req, res) => {
    const Id = req.params.id;
    const body = req.body;

    if (!Id) {
        return res.status(400).json({ error: "Id is required for update" });
    }

    const updates = [];
    const values = [];

    Object.entries(body).forEach(([key, value]) => {
        updates.push(`${key} = ?`);
        values.push(value);
    });

    if (updates.length === 0) {
        return res.status(400).json({ error: "No fields provided to update" });
    }

    const sql = `UPDATE systemusers SET ${updates.join(', ')} WHERE Id = ?`;
    values.push(Id);

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User updated successfully", result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH - partial update
router.patch('/:id', async (req, res) => {
    const Id = req.params.id;
    const body = req.body;

    if (!Id) {
        return res.status(400).json({ error: "Id is required for patch" });
    }

    const updates = [];
    const values = [];

    Object.entries(body).forEach(([key, value]) => {
        updates.push(`${key} = ?`);
        values.push(value);
    });

    if (updates.length === 0) {
        return res.status(400).json({ error: "No fields provided to patch" });
    }

    const sql = `UPDATE systemusers SET ${updates.join(', ')} WHERE Id = ?`;
    values.push(Id);

    try {
        const [result] = await dbPool.promise().query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User patched successfully", result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE - delete user
router.delete('/:id', async (req, res) => {
    const { Id } = req.params;

    if (!Id) {
        return res.status(400).json({ error: "Id is required for deletion" });
    }

    const sql = `DELETE FROM systemusers WHERE Id = ?`;

    try {
        const [result] = await dbPool.promise().query(sql, [Id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully", result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        let { username, password } = req.body;

        const [users] = await dbPool.promise().query(
            "SELECT * FROM systemusers WHERE sUser = ?",
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = users[0];

        // ✅ compare hashed password
        const isMatch = await bcrypt.compare(password, user.sPass);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // ✅ generate token
        const token = jwt.sign(
            { id: user.Id, username: user.sUser, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // ✅ 1 week
        );

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.Id,
                username: user.sUser,
                fullName: user.fullName,
                userType: user.userType,
            },
            auth_token: token
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login error" });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(400).json({ error: "Token required" });
        }

        const token = authHeader.split(' ')[1];

        // Decode without verifying expiration (we just need expiry time)
        const decoded = jwt.decode(token);

        if (!decoded) {
            return res.status(400).json({ error: "Invalid token" });
        }

        await dbPool.promise().query(
            "INSERT INTO token_blacklist (token, expiresAt) VALUES (?, ?)",
            [token, new Date(decoded.exp * 1000)]
        );

        res.status(200).json({ message: "Logged out successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Logout error" }  );
    }
});

module.exports = router;
