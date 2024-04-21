const express = require("express");
const router = express.Router();

// const { validate } = require("../middlewares");

const { newslatterController } = require("../controllers");

// const authuserValidation = require("../validations/authuser.ValidationRules");

router.post(
  "/",
  // validate(authuserValidation.addAuthUser),
  newslatterController.subscribe
);

module.exports = router;
