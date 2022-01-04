const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const { locateError } = require('../utils/errorUtils');
const { tokenTypes } = require('../config/tokens');

// SERVICE DEPENDENCIES
const { 
	authService, 
	tokenService, 
	emailService 
} = require('../services');



const signup = asyncHandler(async (req, res) => {
	try {
		const { email, password } = req.body;
		const userAgent = req.useragent.source;
	
		const authuser = await authService.signupWithEmailAndPassword(email, password);
		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
		req.authuser = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.CREATED).send({ 
			user: authuser.filter(),
			tokens: { 
				access: tokens.access,
				refresh: tokens.refresh.filter(),
			}
		});
		
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
	
		req.authuser = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.OK).send({ 
			user: authuser.filter(),
			tokens: { 
				access: tokens.access,
				refresh: tokens.refresh.filter(),
			}
		});
		
	} catch (error) {
		throw locateError(error, "AuthController : login");
	}
});



const loginWithAuthProvider = asyncHandler(async (req, res) => {
	try {
		const { id, email } = req.oAuth.user;
		const authProvider = req.oAuth.provider;
		const userAgent = req.useragent.source;
	
		const authuser = await authService.loginWithAuthProvider(authProvider, id, email);
		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);
	
		res.status(httpStatus.OK).send({ 
			user: authuser.filter(),
			tokens: { 
				access: tokens.access,
				refresh: tokens.refresh.filter(),
			}
		});
		
	} catch (error) {
		throw locateError(error, "AuthController : oAuth");
	}
});



const logout = asyncHandler(async (req, res) => {
	try {
		const id = req.authuser.id; // added in the authenticate middleware
		const jti = req.jti; // added in the authenticate middleware
	
		// delete the refresh token family from db
		await tokenService.findTokenAndRemoveFamily({ user: id, jti }, "family");

		await authService.logout(id, jti);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : logout");
	}
});



const signout = asyncHandler(async (req, res) => {
	try {
		const id = req.authuser.id; // added in the authenticate middleware
		const jti = req.jti; // added in the authenticate middleware
	
		// delete the whole tokens of the user from db
		await tokenService.findTokenAndRemoveFamily({ user: id, jti }, "user");

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

		// ensure the refresh token blacklisted during RTR and get back the document
		const { user: id, family } = await tokenService.refreshTokenRotation(refreshtoken, userAgent);
	
		const authuser = await authService.refreshAuth(id);

		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent, family);
	
		req.authuser = authuser; // for morgan logger to tokenize it as user
		
		res.status(httpStatus.OK).send({ 
			access: tokens.access,
			refresh: tokens.refresh.filter(),
		});
		
	} catch (error) {
		throw locateError(error, "AuthController : refreshTokens");
	}
});



const forgotPassword = asyncHandler(async (req, res) => {
	try {
		const email = req.body.email;
		
		const authuser = await authService.forgotPassword(email);

		const resetPasswordToken = await tokenService.generateResetPasswordToken(authuser.id);

		await emailService.sendResetPasswordEmail(email, resetPasswordToken.token);
	
		req.authuser = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : forgotPassword");
	}
});



const resetPassword = asyncHandler(async (req, res) => {
	try {
		const { token, password } = req.body;

		const { user: id } = await tokenService.verifyToken(token, tokenTypes.RESET_PASSWORD);
		
		const authuser = await authService.resetPassword(id, password);

		await tokenService.removeTokens({ user: id, type: tokenTypes.RESET_PASSWORD });

		req.authuser = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : resetPassword");
	}
});



const sendVerificationEmail = asyncHandler(async (req, res, next) => {
	try {
		const { id, email, isEmailVerified } = req.authuser;
	
		authService.handleEmailIsVerified(isEmailVerified);

		const verifyEmailToken = await tokenService.generateVerifyEmailToken(id);

		await emailService.sendVerificationEmail(email, verifyEmailToken.token);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : sendVerificationEmail");
	}
});



const verifyEmail = asyncHandler(async (req, res) => {
	try {
		const token = req.body.token;

		const { user: id } = await tokenService.verifyToken(token, tokenTypes.VERIFY_EMAIL);
		
		const authuser = await authService.verifyEmail(id);

		await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.VERIFY_EMAIL });
	
		req.authuser = authuser; // for morgan logger to tokenize it as user
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthController : verifyEmail");
	}
});



module.exports = {
	signup,
	login,
	loginWithAuthProvider,
	logout,
	signout,
	refreshTokens,
	forgotPassword,
	resetPassword,
	sendVerificationEmail,
	verifyEmail,
};