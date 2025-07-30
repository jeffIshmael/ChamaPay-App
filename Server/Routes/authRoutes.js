// routes for authentication i.e login & signup
const express = require("express");
const router = express.Router();
const { 
  requestRegistration, 
  verifyEmailAndCompleteRegistration,
  resendOTP,
  login 
} = require("../Controllers/authController");

// Registration endpoints
router.post("/request-registration", requestRegistration);
router.post("/verify-email", verifyEmailAndCompleteRegistration);
router.post("/resend-otp", resendOTP);

// Login endpoint
router.post("/login", login);

module.exports = router;
