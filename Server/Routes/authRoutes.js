// routes for authentication i.e login & signup
const express = require("express");
const router = express.Router();
const { 
  requestRegistration, 
  verifyEmailAndCompleteRegistration,
  resendOTP,
  login,
  getMnemonic
} = require("../Controllers/authController");
const authenticate = require("../Middlewares/authMiddleware");

// Registration endpoints
router.post("/request-registration", requestRegistration);
router.post("/verify-email", verifyEmailAndCompleteRegistration);
router.post("/resend-otp", resendOTP);

// Login endpoint
router.post("/login", login);

// Protected endpoints
router.post("/get-mnemonic", authenticate, getMnemonic);

module.exports = router;
