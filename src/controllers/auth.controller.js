const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

const ApiError = require('../utils/ApiError');

const { 
	authService, 
	tokenService, // forgotPassword sendVerificationEmail signup login
	emailService  // forgotPassword sendVerificationEmail
} = require('../services');



const signup = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	const authuser = await authService.signupWithEmailAndPassword(email, password);
	const tokens = await tokenService.generateAuthTokens(authuser);
	await userService.createUser(authuser);

	res.status(httpStatus.CREATED).send({ user: authuser.authfilter(), tokens });
});

const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	const user = await authService.loginWithEmailAndPassword(email, password);
	const tokens = await tokenService.generateAuthTokens(user);

	res.status(httpStatus.OK).send({ user: user.authfilter(), tokens });
});

const logout = asyncHandler(async (req, res) => {
	const refreshtoken = req.body.refreshToken;

	await authService.logout(refreshtoken);

	res.status(httpStatus.NO_CONTENT).send();
});

const signout = asyncHandler(async (req, res) => {
	const refreshtoken = req.body.refreshToken;

	await authService.signout(refreshtoken);

	res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = asyncHandler(async (req, res) => {
	const refreshtoken = req.body.refreshToken;

	const tokens = await authService.refreshAuth(refreshtoken);

	res.status(httpStatus.OK).send({ ...tokens });
});

const changePassword = asyncHandler(async (req, res) => {
	const currentPassword = req.body.currentPassword;
	const newPassword = req.body.password;
	const authuser = req.user;

	await authService.changePassword(authuser, currentPassword, newPassword);

	res.status(httpStatus.NO_CONTENT).send();
});

const forgotPassword = asyncHandler(async (req, res) => {
	const email = req.body.email;

	const authuser = await authuserService.getAuthUserByEmail(email);
	if (!authuser) {
		throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
	}

	const resetPasswordToken = await tokenService.generateResetPasswordToken(authuser);
	await emailService.sendResetPasswordEmail(email, resetPasswordToken);

	res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = asyncHandler(async (req, res) => {
	const token = req.query.token;
	const password = req.body.password;

	await authService.resetPassword(token, password);

	res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = asyncHandler(async (req, res, next) => {
	const authuser = req.user;

	if (authuser.isEmailVerified) {
		throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");

	} else {
		const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser);
		emailService.sendVerificationEmail(authuser.email, verifyEmailToken)
		.then(() => {res.status(httpStatus.NO_CONTENT).send()})
		.catch((err) => {next(err)});
	}
});

const verifyEmail = asyncHandler(async (req, res) => {
	const token = req.query.token;

	await authService.verifyEmail(token);

	res.status(httpStatus.NO_CONTENT).send();
});


module.exports = {
	signup,
	login,
	logout,
	signout,
	refreshTokens,
	changePassword,
	forgotPassword,
	resetPassword,
	sendVerificationEmail,
	verifyEmail,
};