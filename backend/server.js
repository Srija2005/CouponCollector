
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// =============== POSTGRESQL CONNECTION ===============

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on("error", (error) => {
  console.error("Database error:", error);
});

async function connectDatabase() {
  try {
    await pool.query("SELECT 1");
    console.log("Neon PostgreSQL connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

// =============== EMAIL CONFIGURATION ===============

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Convert database coupon fields into frontend-friendly fields
function formatCoupon(row) {
  return {
    _id: String(row.id),
    id: row.id,
    code: row.code,
    discount: Number(row.discount),
    expiryDate: row.expiry_date,
    createdBy: row.created_by,
    expiryNotificationSent: row.expiry_notification_sent,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =============== HOME ===============

app.get("/", (req, res) => {
  res.send("Coupons collector Backend is Running");
});

// =============== REGISTER ===============

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill all fields"
      });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)`,
      [name, normalizedEmail, hashedPassword, "admin"]
    );

    res.status(201).json({
      message: "Registration successful"
    });

  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "23505") {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    res.status(500).json({
      message: "Registration failed"
    });
  }
});

// =============== LOGIN ===============

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password"
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h"
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed"
    });
  }
});

// =============== VERIFY LOGIN ===============

function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Please login first"
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Invalid authorization format"
      });
    }

    const decoded = jwt.verify(
      parts[1],
      process.env.JWT_SECRET
    );

    if (decoded.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    console.error("Authorization error:", error);

    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

// =============== GET USER'S COUPONS ===============

app.get("/coupons", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM coupons
       WHERE created_by = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json(result.rows.map(formatCoupon));

  } catch (error) {
    console.error("Get coupons error:", error);

    res.status(500).json({
      message: "Error getting coupons"
    });
  }
});

// =============== GET ONE COUPON ===============

app.get("/coupons/:id", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM coupons
       WHERE id = $1 AND created_by = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coupon not found or you are not allowed to access it"
      });
    }

    res.json(formatCoupon(result.rows[0]));

  } catch (error) {
    console.error("Get coupon error:", error);

    res.status(500).json({
      message: "Error getting coupon"
    });
  }
});

// =============== ADD COUPON ===============

app.post("/coupons", verifyAdmin, async (req, res) => {
  try {
    const { code, discount, expiryDate } = req.body;

    if (
      !code ||
      discount === undefined ||
      discount === "" ||
      !expiryDate ||
      !Number.isFinite(Number(discount))
    ) {
      return res.status(400).json({
        message: "Please fill all fields correctly"
      });
    }

    const result = await pool.query(
      `INSERT INTO coupons
       (code, discount, expiry_date, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        code,
        Number(discount),
        expiryDate,
        req.user.userId
      ]
    );

    res.status(201).json({
      message: "Coupon added successfully",
      coupon: formatCoupon(result.rows[0])
    });

  } catch (error) {
    console.error("Add coupon error:", error);

    res.status(500).json({
      message: "Error adding coupon"
    });
  }
});

// =============== EDIT COUPON ===============

app.put("/coupons/:id", verifyAdmin, async (req, res) => {
  try {
    const { code, discount, expiryDate } = req.body;

    if (
      !code ||
      discount === undefined ||
      discount === "" ||
      !expiryDate ||
      !Number.isFinite(Number(discount))
    ) {
      return res.status(400).json({
        message: "Please fill all fields correctly"
      });
    }

    const result = await pool.query(
      `UPDATE coupons
       SET code = $1,
           discount = $2,
           expiry_date = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND created_by = $5
       RETURNING *`,
      [
        code,
        Number(discount),
        expiryDate,
        req.params.id,
        req.user.userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coupon not found or you are not allowed to edit it"
      });
    }

    res.json({
      message: "Coupon updated successfully",
      coupon: formatCoupon(result.rows[0])
    });

  } catch (error) {
    console.error("Edit coupon error:", error);

    res.status(500).json({
      message: "Error updating coupon"
    });
  }
});

// =============== PATCH COUPON ===============

app.patch("/coupons/:id", verifyAdmin, async (req, res) => {
  try {
    const { code, discount, expiryDate } = req.body;
    const updates = [];
    const values = [];

    if (code !== undefined) {
      if (typeof code !== "string" || !code.trim()) {
        return res.status(400).json({
          message: "Coupon code cannot be empty"
        });
      }

      values.push(code.trim());
      updates.push(`code = $${values.length}`);
    }

    if (discount !== undefined) {
      if (discount === "" || !Number.isFinite(Number(discount))) {
        return res.status(400).json({
          message: "Discount must be a valid number"
        });
      }

      values.push(Number(discount));
      updates.push(`discount = $${values.length}`);
    }

    if (expiryDate !== undefined) {
      if (typeof expiryDate !== "string" || !expiryDate.trim()) {
        return res.status(400).json({
          message: "Expiry date cannot be empty"
        });
      }

      values.push(expiryDate.trim());
      updates.push(`expiry_date = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "Please provide at least one field to update"
      });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    values.push(req.params.id);
    const idPosition = values.length;

    values.push(req.user.userId);
    const userPosition = values.length;

    const result = await pool.query(
      `UPDATE coupons
       SET ${updates.join(", ")}
       WHERE id = $${idPosition}
         AND created_by = $${userPosition}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coupon not found or you are not allowed to edit it"
      });
    }

    res.json({
      message: "Coupon updated successfully",
      coupon: formatCoupon(result.rows[0])
    });

  } catch (error) {
    console.error("Patch coupon error:", error);

    res.status(500).json({
      message: "Error updating coupon"
    });
  }
});

// =============== DELETE COUPON ===============

app.delete("/coupons/:id", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM coupons
       WHERE id = $1 AND created_by = $2
       RETURNING id`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Coupon not found or you are not allowed to delete it"
      });
    }

    res.json({
      message: "Coupon deleted successfully"
    });

  } catch (error) {
    console.error("Delete coupon error:", error);

    res.status(500).json({
      message: "Error deleting coupon"
    });
  }
});

// =============== EXPIRY EMAIL REMINDERS ===============


async function checkExpiringCoupons() {
  try {
    console.log("Checking coupons expiring in 2 days...");

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("Email credentials are not configured.");
      return;
    }

    const result = await pool.query(
      `SELECT c.*, u.name, u.email
       FROM coupons c
       JOIN users u ON c.created_by = u.id
       WHERE c.expiry_date = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'YYYY-MM-DD')
       AND c.expiry_notification_sent = FALSE`
    );

    console.log("Coupons found:", result.rows.length);

    for (const coupon of result.rows) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: coupon.email,
          subject: `Coupon "${coupon.code}" expires in 2 days`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Coupon Expiry Reminder</h2>
              <p>Hello ${coupon.name},</p>
              <p>Your coupon expires in <strong>2 days</strong>.</p>
              <p><strong>Coupon Code:</strong> ${coupon.code}</p>
              <p><strong>Discount:</strong> ${coupon.discount}%</p>
              <p><strong>Expiry Date:</strong> ${coupon.expiry_date}</p>
              <p>Please use or update this coupon before it expires.</p>
              <p>Thank you,<br/>Coupons Collector</p>
            </div>
          `
        });

        await pool.query(
          `UPDATE coupons
           SET expiry_notification_sent = TRUE
           WHERE id = $1`,
          [coupon.id]
        );

        console.log("Expiry email sent to:", coupon.email);

      } catch (emailError) {
        console.error(
          "Email failed for coupon:",
          coupon.code,
          emailError.message
        );
      }
    }

  } catch (error) {
    console.error("Expiry notification error:", error);
  }
}

// Run every day at 9 AM (server timezone)
cron.schedule("0 9 * * *", checkExpiringCoupons);

// =============== START SERVER ===============

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
