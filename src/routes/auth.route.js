const express = require('express');

const { auth } = require('../middlewares/auth');
const { oAuth, google_oAuth, facebook_oAuth } = require('../middlewares/oauth');

const validate = require('../middlewares/validate');

const { authController } = require('../controllers');

const { 
	signupValidationRules,
	loginValidationRules,
	logoutValidationRules,
	signoutValidationRules,
	refreshTokensValidationRules,
	forgotPasswordValidationRules,
	resetPasswordValidationRules,
	verifyEmailValidationRules,
	oAuthValidationRules } = require('../validations/auth.ValidationRules');

const router = express.Router();

router.post('/signup', validate(signupValidationRules), authController.signup);
router.post('/login', validate(loginValidationRules), authController.login);
router.post('/logout', auth(), validate(logoutValidationRules), authController.logout);
router.post('/signout', auth(), validate(signoutValidationRules), authController.signout);
router.post('/refresh-tokens', validate(refreshTokensValidationRules), authController.refreshTokens);
router.post('/forgot-password', validate(forgotPasswordValidationRules), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordValidationRules), authController.resetPassword);
router.post('/verify-email', validate(verifyEmailValidationRules), authController.verifyEmail);
router.post('/send-verification-email', auth(), authController.sendVerificationEmail);

router.post('/google', validate(oAuthValidationRules), google_oAuth, authController.oAuth);
router.post('/facebook', validate(oAuthValidationRules), facebook_oAuth, authController.oAuth);
router.post('/google/passport', oAuth("google"), authController.oAuth);
router.post('/facebook/passport', oAuth("facebook"), authController.oAuth);

module.exports = router;
