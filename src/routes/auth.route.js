const express = require("express");
const router = express.Router();

const { authenticate, validate, oAuth } = require("../middlewares");

const { authController } = require("../controllers");

const {
  signupValidationRules,
  loginValidationRules,
  refreshTokensValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  verifyEmailValidationRules,
  googleValidationRules,
  unlinkProviderValidationRules,
  verifySignupValidationRules,
} = require("../validations/auth.ValidationRules");

router.post("/signup", validate(signupValidationRules), authController.signup);
router.post("/login", validate(loginValidationRules), authController.login);

router.post("/logout", authenticate, authController.logout);
router.post("/signout", authenticate, authController.signout);

router.post(
  "/refresh-tokens",
  validate(refreshTokensValidationRules),
  authController.refreshTokens,
);

router.post(
  "/forgot-password",
  validate(forgotPasswordValidationRules),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validate(resetPasswordValidationRules),
  authController.resetPassword,
);

router.post("/send-verification-email", authenticate, authController.sendVerificationEmail);

router.post("/verify-email", validate(verifyEmailValidationRules), authController.verifyEmail);

router.post(
  "/google",
  validate(googleValidationRules),
  oAuth("google"),
  authController.continueWithAuthProvider,
);

router.post("/facebook", oAuth("facebook"), authController.continueWithAuthProvider);

router.post(
  "/send-signup-verification-email",
  authenticate,
  authController.sendSignupVerificationEmail,
);

router.post(
  "/verify-signup",
  validate(verifySignupValidationRules),
  authController.verifySignup,
);

router.post(
  "/unlink",
  authenticate,
  validate(unlinkProviderValidationRules),
  authController.unlinkAuthProvider,
);

module.exports = router;
