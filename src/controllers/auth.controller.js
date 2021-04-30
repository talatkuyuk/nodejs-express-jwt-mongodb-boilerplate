const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

const { authService, tokenService, emailService } = require('../services');
const ApiError = require('../utils/ApiError');


const signup = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.signupWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user: user.filter(), tokens });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user: user.filter(), tokens });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const signout = asyncHandler(async (req, res) => {
	await authService.signout(req.body.refreshToken);
	res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = asyncHandler(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = asyncHandler(async (req, res) => {
	if (req.user.isEmailVerified) {
		throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");
	} else {
		const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
		await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
		res.status(httpStatus.NO_CONTENT).send();
	}
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});


module.exports = {
	signup,
	login,
	logout,
	signout,
	refreshTokens,
	forgotPassword,
	resetPassword,
	sendVerificationEmail,
	verifyEmail,
};