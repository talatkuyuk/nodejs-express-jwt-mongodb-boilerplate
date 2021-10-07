const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

// SERVICE DEPENDENCY
const { 
	authService,
	authuserService,      //getAuthUser: forgotPassword
	tokenService,   //generate token(s): forgotPassword, sendVerificationEmail, signup, login, refreshTokens
	emailService,          //send email: forgotPassword, sendVerificationEmail
} = require('../services');




const signup = asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	const userAgent = req.useragent.source;

	const authuser = await authService.signupWithEmailAndPassword(email, password);
	const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

	req.user = authuser; // for morgan logger to tokenize it as user

	res.status(httpStatus.CREATED).send({ user: authuser.filter(), tokens });
});



const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	const userAgent = req.useragent.source;

	const authuser = await authService.loginWithEmailAndPassword(email, password);
	const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

	req.user = authuser; // for morgan logger to tokenize it as user

	res.status(httpStatus.OK).send({ user: authuser.filter(), tokens });
});



const logout = asyncHandler(async (req, res) => {
	// const accessToken = req.header('Authorization').replace('Bearer ', '');
	const accessToken = req.headers.authorization.split(' ')[1];
	const refreshtoken = req.body.refreshToken;
	const authuser = req.user;

	await authService.logout(authuser, accessToken, refreshtoken);

	res.status(httpStatus.NO_CONTENT).send();
});



const signout = asyncHandler(async (req, res) => {
	const accessToken = req.headers.authorization.split(' ')[1];
	const refreshtoken = req.body.refreshToken;
	const authuser = req.user;

	await authService.signout(authuser, accessToken, refreshtoken);

	res.status(httpStatus.NO_CONTENT).send();
});



const refreshTokens = asyncHandler(async (req, res) => {
	const refreshtoken = req.body.refreshToken;
	const userAgent = req.useragent.source;

	const { authuser, refreshTokenFamily } = await authService.refreshAuth(refreshtoken, userAgent);
	const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent, refreshTokenFamily);

	req.user = authuser; // for morgan logger to tokenize it as user
	
	res.status(httpStatus.OK).send({ ...tokens });
});



const forgotPassword = asyncHandler(async (req, res) => {
	const email = req.body.email;
	const callbackURL = req.body.callbackURL;
	
	const authuser = await authuserService.getAuthUserByEmail(email);
	const resetPasswordToken = await tokenService.generateResetPasswordToken(authuser.id);
	await emailService.sendResetPasswordEmail(email, resetPasswordToken, callbackURL);

	req.user = authuser; // for morgan logger to tokenize it as user

	res.status(httpStatus.NO_CONTENT).send();
});



const resetPassword = asyncHandler(async (req, res) => {
	const token = req.query.token;
	const password = req.body.password;

	const authuser = await authService.resetPassword(token, password);

	req.user = authuser; // for morgan logger to tokenize it as user

	res.status(httpStatus.NO_CONTENT).send();
});



const sendVerificationEmail = asyncHandler(async (req, res, next) => {
	const { id, email, isEmailVerified } = req.user;

	authService.handleEmailIsAlreadyVerified(isEmailVerified);
	const verifyEmailToken = await tokenService.generateVerifyEmailToken(id);
	await emailService.sendVerificationEmail(email, verifyEmailToken);

	res.status(httpStatus.NO_CONTENT).send();

});



const verifyEmail = asyncHandler(async (req, res) => {
	const token = req.query.token;

	const authuser = await authService.verifyEmail(token);

	req.user = authuser; // for morgan logger to tokenize it as user

	res.status(httpStatus.NO_CONTENT).send();
});


const oAuth = asyncHandler(async (req, res) => {
	const { id, email } = req.oAuth.user;
	const oAuthProvider = req.oAuth.provider;
	const userAgent = req.useragent.source;

	const authuser = await authService.loginWith_oAuth(oAuthProvider, id, email);
	const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	res.status(httpStatus.OK).send({ user: authuser.filter(), tokens });
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
	oAuth
};