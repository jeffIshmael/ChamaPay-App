// This file has routes for user operations
const express = require("express");
const router = express.Router();
const {
  getUser,
} = require("../Controllers/userController");
const authenticate = require("../Middlewares/authMiddleware");

// get functions
router.get("/", authenticate, getUser);
// router.get("/payments", authenticate, getUserPayments);
// router.get("/notifications", authenticate, getUserNotifications);

module.exports = router;