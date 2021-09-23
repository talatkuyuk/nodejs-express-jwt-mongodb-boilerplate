const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

const ApiError = require('../utils/ApiError');

const { 
	authService,

	//generate token(s): signup login refreshAuth forgotPassword sendVerificationEmail
	tokenService,
	
	//send email: forgotPassword sendVerificationEmail
	emailService,

	//get auth user by email: forgotPassword
	authuserService,

} = require('../services');




const signup = asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	const userAgent = req.useragent.source;

	const authuser = await authService.signupWithEmailAndPassword(email, password);
	const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

	req.user = authuser; // for morgan logger to tokenize it as user

	res.status(httpStatus.CREATED).send({ user: authuser.authfilter(), tokens });
});



const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	const userAgent = req.useragent.source;

	const authuser = await authService.loginWithEmailAndPassword(email, password);
	const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

	req.user = authuser; // for morgan logger to tokenize it as user

	res.status(httpStatus.OK).send({ user: authuser.authfilter(), tokens });
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

	await authService.signout(accessToken, refreshtoken);

	res.status(httpStatus.NO_CONTENT).send();
});



const refreshTokens = asyncHandler(async (req, res) => {
	const refreshtoken = req.body.refreshToken;
	const userAgent = req.useragent.source;

	const { tokens, authuser } = await authService.refreshAuth(refreshtoken, userAgent);

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
	const authuser = req.user;

	if (authuser.isEmailVerified) {
		throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified");

	} else {
		const verifyEmailToken = await tokenService.generateVerifyEmailToken(authuser.id);
		emailService.sendVerificationEmail(authuser.email, verifyEmailToken)
		.then(() => {res.status(httpStatus.NO_CONTENT).send()})
		.catch((err) => {next(err)});
	}
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
	res.status(httpStatus.OK).send({ user: authuser.authfilter(), tokens });
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