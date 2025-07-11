const { db } = require("../firebaseAdmin");
const bcrypt = require("bcrypt");

// POST: Register new user
const cloudinary = require("../cloudinaryConfig");
const multer = require("multer");

// Multer setup for file upload in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });
const nodemailer = require("nodemailer");

// Setup nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendWelcomeEmail = async (toEmail, username = "User") => {
  const mailOptions = {
    from: `"Hostel Admin" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Welcome to the Platform!",
    text: `Hi ${username},\n\nYour account has been successfully registered.\n\nThank you for joining us!\n\n Start Our Service to make easy to connect to department faculty`,
  };

  await transporter.sendMail(mailOptions);
};

const registerUser = [
  upload.single("profileImage"), // Only for single-user uploads with image
  async (req, res) => {
    try {
      const body = req.body;
      let users = [];

      // Accept `user`, `users`, or raw object
      if (Array.isArray(body)) {
        users = body;
      } else if (body.users) {
        users = typeof body.users === "string" ? JSON.parse(body.users) : body.users;
      } else if (body.user) {
        users = typeof body.user === "string" ? [JSON.parse(body.user)] : [body.user];
      } else if (typeof body === "object" && body.email && body.password) {
        users = [body];
      } else {
        return res.status(400).json({
          message: "Invalid request format. Provide `user` or `users` with email and password.",
        });
      }

      const results = [];

      for (let i = 0; i < users.length; i++) {
        const { email, password, ...rest } = users[i];

        if (!email || !password) {
          results.push({
            email: email || "unknown",
            status: "failed",
            reason: "Email and password are required.",
          });
          continue;
        }

        // Check if user already exists
        const existingSnap = await db.collection("users").where("email", "==", email).get();
        if (!existingSnap.empty) {
          results.push({
            email,
            status: "skipped",
            reason: "User already exists.",
          });
          continue;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Upload profile image if exists
        let profileImageUrl = null;
        if (req.file && users.length === 1) {
          const fileName = `profileImages/${Date.now()}_${req.file.originalname}`;
          const file = bucket.file(fileName);
          const stream = file.createWriteStream({
            metadata: {
              contentType: req.file.mimetype,
            },
          });

          stream.end(req.file.buffer);

          await new Promise((resolve, reject) => {
            stream.on("finish", resolve);
            stream.on("error", reject);
          });

          const [url] = await file.getSignedUrl({
            action: "read",
            expires: "03-01-2030",
          });

          profileImageUrl = url;
        }

        const userData = {
          email,
          password: hashedPassword,
          profileImageUrl,
          ...rest,
          createdAt: new Date().toISOString(),
        };

        const newUserRef = db.collection("users").doc();
        await newUserRef.set(userData);

        // Send welcome email
        try {
          await sendWelcomeEmail(email, rest.username || email.split("@")[0]);
        } catch (emailErr) {
          console.warn(`Failed to send email to ${email}:`, emailErr.message);
        }

        results.push({
          email,
          status: "created",
          id: newUserRef.id,
        });
      }

      res.status(201).json({
        message: "User registration process completed.",
        results,
      });
    } catch (error) {
      console.error("Register Error:", error);
      res.status(500).json({
        message: "Registration failed",
        error: error.message,
      });
    }
  },
];


// POST: Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "User not found" });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Send user info (without password)
    res.status(200).json({
      id: userDoc.id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      gender: user.gender,
      profileImageUrl: user.profileImageUrl || null,
      Image:user.image
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};


// GET: All users
const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(users);
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ message: "Failed to retrieve users" });
  }
};

// GET: User by email
const getUserByEmail = async (req, res) => {
  const { email } = req.params;

  try {
    const snapshot = await db.collection("users").where("email", "==", email).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = snapshot.docs[0].data();
    res.status(200).json(user);
  } catch (error) {
    console.error("Get User by Email Error:", error);
    res.status(500).json({ message: "Failed to get user" });
  }
};

// GET: Users by role (student, teacher, admin)
const getUsersByRole = async (req, res) => {
  const { role } = req.params;

  try {
    const snapshot = await db.collection("users").where("role", "==", role).get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(users);
  } catch (error) {
    console.error("Get Users by Role Error:", error);
    res.status(500).json({ message: "Failed to retrieve users by role" });
  }
};

// PUT: Update user details (by ID or email)
const updateUser = [
  upload.single("image"), // use 'image' to match frontend FormData key
  async (req, res) => {
    try {
      const { email } = req.params;

      const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();
      if (snapshot.empty) {
        return res.status(404).json({ message: "User not found" });
      }

      const userDoc = snapshot.docs[0];
      const userRef = db.collection("users").doc(userDoc.id);
      const updateData = { ...req.body };

      // Optional: parse numbers if needed
      if (updateData.mobile) {
        updateData.mobile = String(updateData.mobile);
      }

      // Handle profile image upload (if new image is provided)
      if (req.file) {
        const streamUpload = (buffer) =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "user_profiles" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              }
            );
            stream.end(buffer);
          });

        const profileImageUrl = await streamUpload(req.file.buffer);
        updateData.profileImageUrl = profileImageUrl;
      }

      // Never allow email/password updates here directly unless intentional
      delete updateData.email;

      await userRef.update(updateData);

      const updatedUserDoc = await userRef.get();
      const updatedUser = updatedUserDoc.data();

      res.status(200).json({ id: userDoc.id, ...updatedUser });
    } catch (error) {
      console.error("Update User Error:", error);
      res.status(500).json({ message: "Failed to update user", error: error.message });
    }
  },
];

// DELETE: Delete user by email
const deleteUser = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required to delete user." });
    }

    const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "User not found." });
    }

    const userDoc = snapshot.docs[0];
    await db.collection("users").doc(userDoc.id).delete();

    res.status(200).json({ message: `User with email ${email} deleted successfully.` });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};




module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  getUserByEmail,
  getUsersByRole,
  updateUser,
  deleteUser
};


