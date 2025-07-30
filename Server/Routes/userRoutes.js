// This file has routes for user operations
const express = require("express");
const router = express.Router();
const {
  getUser,
  updateUserProfile,
} = require("../Controllers/userController");
const authenticate = require("../Middlewares/authMiddleware");

// get functions
router.get("/", authenticate, getUser);
// router.get("/payments", authenticate, getUserPayments);
// router.get("/notifications", authenticate, getUserNotifications);

// update functions
router.put("/profile", authenticate, updateUserProfile);

module.exports = router;