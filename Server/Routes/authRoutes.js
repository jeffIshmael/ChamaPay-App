// routes for authentication i.e login & signup
const express = require("express");
const router = express.Router();
const { register, login } = require("../Controllers/authController");

router.post("/register", register);
router.post("/login", login);

module.exports = router;