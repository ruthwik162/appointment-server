const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  registerUser,
  loginUser,
  getAllUsers,
  getUserByEmail,
  updateUser,
  getUsersByRole,
  deleteUser,
} = require("../controllers/userController");

// POST
router.post("/users", upload.single("profileImage"), registerUser);
router.post("/login", loginUser);

// PUT
router.put("/users/:email", updateUser);

// GET
router.get("/users", getAllUsers);
router.get("/users/email/:email", getUserByEmail);
router.get("/users/role/:role", getUsersByRole);

// DELETE
router.delete("/users/:email", deleteUser);

module.exports = router;
