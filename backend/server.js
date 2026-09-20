const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
require("dotenv").config();
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
emailTransporter.verify((error, success) => {
  if (error) {
    console.error("EMAIL CONFIGURATION ERROR:");
    console.error(error);
  } else {
    console.log("EMAIL SERVER IS READY");
  }
});

const app = express();

app.use(cors());
app.use(express.json());

// ================= MONGODB CONNECTION =================

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    console.log("Running expiry check manually...");
    checkExpiringCoupons();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// ================= USER SCHEMA =================
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      default: "admin"
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);
// ================= COUPON SCHEMA =================

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true
    },

    discount: {
      type: Number,
      required: true
    },

    expiryDate: {
      type: String,
      required: true
    },

    // User who created this coupon
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Coupon = mongoose.model("Coupon", couponSchema);

// ================= HOME =================

app.get("/", (req, res) => {
  res.send(
    "Coupons collector Backend is Running"
  );
});

// ================= REGISTER =================

app.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    console.log("Registration request:");
    console.log("Name:", name);
    console.log("Email:", email);

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill all fields"
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = new User({
      name: name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin"
    });

    await user.save();

    console.log("User registered successfully");

    res.status(201).json({
      message: "Registration successful"
    });

  } catch (error) {
    console.log(
      "Registration error:",
      error
    );

    res.status(500).json({
      message: "Registration failed"
    });
  }
});

// ================= LOGIN =================

app.post("/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    console.log("--------------------------------");
    console.log("LOGIN REQUEST");
    console.log("Email:", email);
    console.log("--------------------------------");

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password"
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      console.log("User not found");

      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      console.log("Password does not match");

      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h"
      }
    );

    console.log("Login successful");

    res.json({
      message: "Login successful",

      token: token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.log(
      "Login error:",
      error
    );

    res.status(500).json({
      message: "Login failed"
    });
  }
});

// ================= VERIFY LOGIN =================

function verifyAdmin(req, res, next) {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Please login first"
      });
    }

    const parts =
      authHeader.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {
      return res.status(401).json({
        message: "Invalid authorization format"
      });
    }

    const token = parts[1];

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (decoded.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    // Store logged-in user information
    req.user = decoded;

    next();

  } catch (error) {
    console.log(
      "Authorization error:",
      error
    );

    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

// ================= GET USER'S COUPONS =================

app.get(
  "/coupons",
  verifyAdmin,
  async (req, res) => {
    try {

      // Only get coupons created by
      // the currently logged-in user
      const coupons =
        await Coupon.find({
          createdBy: req.user.userId
        }).sort({
          createdAt: -1
        });

      res.json(coupons);

    } catch (error) {

      console.log(
        "Get coupons error:",
        error
      );

      res.status(500).json({
        message: "Error getting coupons"
      });
    }
  }
);

// ================= GET ONE USER'S COUPON =================

app.get(
  "/coupons/:id",
  verifyAdmin,
  async (req, res) => {
    try {

      // Find coupon only if it belongs
      // to the logged-in user
      const coupon =
        await Coupon.findOne({
          _id: req.params.id,
          createdBy: req.user.userId
        });

      if (!coupon) {
        return res.status(404).json({
          message:
            "Coupon not found or you are not allowed to access it"
        });
      }

      res.json(coupon);

    } catch (error) {

      console.log(
        "Get coupon error:",
        error
      );

      res.status(500).json({
        message: "Error getting coupon"
      });
    }
  }
);

// ================= ADD COUPON =================

app.post(
  "/coupons",
  verifyAdmin,
  async (req, res) => {
    try {

      const {
        code,
        discount,
        expiryDate
      } = req.body;

      console.log(
        "ADD COUPON REQUEST"
      );

      console.log(req.body);

      if (
        !code ||
        discount === undefined ||
        discount === "" ||
        !expiryDate
      ) {
        return res.status(400).json({
          message: "Please fill all fields"
        });
      }

      // Create coupon and connect it
      // with the logged-in user
      const coupon = new Coupon({
        code: code,
        discount: Number(discount),
        expiryDate: expiryDate,

        createdBy:
          req.user.userId
      });

      await coupon.save();

      console.log(
        "Coupon added successfully"
      );

      res.status(201).json({
        message:
          "Coupon added successfully",

        coupon: coupon
      });

    } catch (error) {

      console.log(
        "Add coupon error:",
        error
      );

      res.status(500).json({
        message: "Error adding coupon"
      });
    }
  }
);

// ================= EDIT COUPON =================

app.put(
  "/coupons/:id",
  verifyAdmin,
  async (req, res) => {
    try {

      const {
        code,
        discount,
        expiryDate
      } = req.body;

      console.log(
        "EDIT COUPON REQUEST"
      );

      console.log(req.body);

      if (
        !code ||
        discount === undefined ||
        discount === "" ||
        !expiryDate
      ) {
        return res.status(400).json({
          message: "Please fill all fields"
        });
      }

      // Update only if the coupon belongs
      // to the logged-in user
      const updatedCoupon =
        await Coupon.findOneAndUpdate(
          {
            _id: req.params.id,
            createdBy: req.user.userId
          },
          {
            code: code,
            discount: Number(discount),
            expiryDate: expiryDate
          },
          {
            new: true,
            runValidators: true
          }
        );

      if (!updatedCoupon) {
        return res.status(404).json({
          message:
            "Coupon not found or you are not allowed to edit it"
        });
      }

      console.log(
        "Coupon updated successfully"
      );

      res.json({
        message:
          "Coupon updated successfully",

        coupon: updatedCoupon
      });

    } catch (error) {

      console.log(
        "Edit coupon error:",
        error
      );

      res.status(500).json({
        message: "Error updating coupon"
      });
    }
  }
);

// ================= DELETE COUPON =================

app.delete(
  "/coupons/:id",
  verifyAdmin,
  async (req, res) => {
    try {

      console.log(
        "DELETE COUPON:",
        req.params.id
      );

      // Delete only if the coupon belongs
      // to the logged-in user
      const deletedCoupon =
        await Coupon.findOneAndDelete({
          _id: req.params.id,
          createdBy: req.user.userId
        });

      if (!deletedCoupon) {
        return res.status(404).json({
          message:
            "Coupon not found or you are not allowed to delete it"
        });
      }

      console.log(
        "Coupon deleted successfully"
      );

      res.json({
        message:
          "Coupon deleted successfully"
      });

    } catch (error) {

      console.log(
        "Delete coupon error:",
        error
      );

      res.status(500).json({
        message: "Error deleting coupon"
      });
    }
  }
);

// ================= SERVER =================

const PORT =
  process.env.PORT || 5000;
async function checkExpiringCoupons() {
  try {
    console.log("Checking for coupons expiring in 2 days...");

    const today = new Date();

    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + 2);

    const year = expiryDate.getFullYear();
    const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
    const day = String(expiryDate.getDate()).padStart(2, "0");

    const targetDate = `${year}-${month}-${day}`;

    console.log("Checking expiry date:", targetDate);

    const coupons = await Coupon.find({
      expiryDate: targetDate
    }).populate("createdBy", "name email");

    console.log("Coupons found:", coupons.length);

    for (const coupon of coupons) {

      if (!coupon.createdBy) {
        console.log(
          `No user found for coupon ${coupon.code}`
        );
        continue;
      }

      if (!coupon.createdBy.email) {
        console.log(
          `No email found for coupon ${coupon.code}`
        );
        continue;
      }

      console.log(
        `Sending expiry email to: ${coupon.createdBy.email}`
      );

      const mailOptions = {
        from: process.env.EMAIL_USER,

        // IMPORTANT:
        // This is the coupon owner's email
        to: coupon.createdBy.email,

        subject: `Coupon "${coupon.code}" expires in 2 days`,

        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #ed1c2e;">
              Coupon Expiry Reminder
            </h2>

            <p>
              Hello ${coupon.createdBy.name},
            </p>

            <p>
              Your coupon is going to expire in
              <strong>2 days</strong>.
            </p>

            <p>
              <strong>Coupon Code:</strong>
              ${coupon.code}
            </p>

            <p>
              <strong>Discount:</strong>
              ${coupon.discount}%
            </p>

            <p>
              <strong>Expiry Date:</strong>
              ${coupon.expiryDate}
            </p>

            <p>
              Please use or update this coupon before it expires.
            </p>

            <br />

            <p>
              Thank you,<br />
              Coupons collector
            </p>
          </div>
        `
      };

      try {
        await emailTransporter.sendMail(mailOptions);

        console.log(
          `Expiry email sent to ${coupon.createdBy.email}`
        );

        coupon.expiryNotificationSent = true;

        await coupon.save();

      } catch (emailError) {
        console.error(
          `Email failed for coupon ${coupon.code}:`,
          emailError.message
        );
      }
    }

  } catch (error) {
    console.error(
      "Expiry notification error:",
      error.message
    );
  }
}
cron.schedule("0 9 * * *", () => {
  console.log("Daily coupon expiry check started");

  checkExpiringCoupons();
});

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});