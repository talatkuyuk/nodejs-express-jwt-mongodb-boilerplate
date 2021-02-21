const express = require('express');

const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { loginValidationRules, signupValidationRules } = require('../validations/authValidationRules');

const router = express.Router();

router.get('/', (req, res) => res.send("Auth"));
router.post('/signup', validate(signupValidationRules), authController.signup);
router.post('/login', validate(loginValidationRules), authController.login);
// router.post('/logout', validate(authValidation.logout), authController.logout);
// router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);
// router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
// router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);

module.exports = router;