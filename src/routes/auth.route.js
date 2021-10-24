const express = require('express');
const router = express.Router();

const { authenticate, validate, oAuth } = require('../middlewares');

const { authController } = require('../controllers');

const { 
	signupValidationRules,
	loginValidationRules,
	refreshTokensValidationRules,
	forgotPasswordValidationRules,
	resetPasswordValidationRules,
	verifyEmailValidationRules } = require('../validations/auth.ValidationRules');


router.post('/signup', validate(signupValidationRules), authController.signup);
router.post('/login', validate(loginValidationRules), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/signout', authenticate, authController.signout);

router.post('/refresh-tokens', validate(refreshTokensValidationRules), authController.refreshTokens);

router.post('/forgot-password', validate(forgotPasswordValidationRules), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordValidationRules), authController.resetPassword);

router.post('/send-verification-email', authenticate, authController.sendVerificationEmail);
router.post('/verify-email', validate(verifyEmailValidationRules), authController.verifyEmail);

router.post('/google', oAuth("google"), authController.oAuth);
router.post('/facebook', oAuth("facebook"), authController.oAuth);


module.exports = router;
