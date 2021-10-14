const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const { locateError } = require('../utils/ApiError');

// SERVICE DEPENDENCY
const { 
	authService,			// all
	tokenService,   		// forgotPassword, sendVerificationEmail, signup, login, refreshTokens
	emailService,          	// forgotPassword, sendVerificationEmail
	authuserService,      	// forgotPassword
} = require('../services');



const signup = asyncHandler(async (req, res) => {
	try {
		const { email, password } = req.body;
		const userAgent = req.useragent.source;
	
		const authuser = await authService.signupWithEmailAndPassword(email, password);
		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
		req.user = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.CREATED).send({ user: authuser.filter(), tokens });
		
	} catch (error) {
		throw locateError(error, "AuthController : signup");
	}
});



const login = asyncHandler(async (req, res) => {
	try {
		const { email, password } = req.body;
		const userAgent = req.useragent.source;
	
		const authuser = await authService.loginWithEmailAndPassword(email, password);
		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
		req.user = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.OK).send({ user: authuser.filter(), tokens });
		
	} catch (error) {
		throw locateError(error, "AuthController : login");
	}
});



const logout = asyncHandler(async (req, res) => {
	try {
		const { id, jti } = req.user; // jti added in the auth middleware
	
		await authService.logout(id, jti);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : logout");
	}
});



const signout = asyncHandler(async (req, res) => {
	try {
		const { id, jti } = req.user; // jti added in the auth middleware
	
		await authService.signout(id, jti);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : signout");
	}
});



const refreshTokens = asyncHandler(async (req, res) => {
	try {
		const refreshtoken = req.body.refreshToken;
		const userAgent = req.useragent.source;
	
		const { authuser, refreshTokenFamily } = await authService.refreshAuth(refreshtoken, userAgent);
		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent, refreshTokenFamily);
	
		req.user = authuser; // for morgan logger to tokenize it as user
		
		res.status(httpStatus.OK).send({ ...tokens });
		
	} catch (error) {
		throw locateError(error, "AuthController : refreshTokens");
	}
});



const forgotPassword = asyncHandler(async (req, res) => {
	try {
		const email = req.body.email;
		
		const authuser = await authuserService.getAuthUserByEmail(email);
		const { resetPasswordToken } = await tokenService.generateResetPasswordToken(authuser.id);
		await emailService.sendResetPasswordEmail(email, resetPasswordToken);
	
		req.user = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : forgotPassword");
	}
});



const resetPassword = asyncHandler(async (req, res) => {
	try {
		const { token, password } = req.body;
	
		console.log({ token, password })
	
		const authuser = await authService.resetPassword(token, password);
	
		req.user = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : resetPassword");
	}
});



const sendVerificationEmail = asyncHandler(async (req, res, next) => {
	try {
		const { id, email, isEmailVerified } = req.user;
	
		authService.handleEmailIsAlreadyVerified(isEmailVerified);
		const { verifyEmailToken } = await tokenService.generateVerifyEmailToken(id);
		await emailService.sendVerificationEmail(email, verifyEmailToken);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : sendVerificationEmail");
	}
});



const verifyEmail = asyncHandler(async (req, res) => {
	try {
		const token = req.body.token;
	
		const authuser = await authService.verifyEmail(token);
	
		req.user = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : verifyEmail");
	}
});


const oAuth = asyncHandler(async (req, res) => {
	try {
		const { id, email } = req.oAuth.user;
		const oAuthProvider = req.oAuth.provider;
		const userAgent = req.useragent.source;
	
		const authuser = await authService.loginWith_oAuth(oAuthProvider, id, email);
		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
		res.status(httpStatus.OK).send({ user: authuser.filter(), tokens });
		
	} catch (error) {
		throw locateError(error, "AuthController : oAuth");
	}
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