const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const { locateError } = require('../utils/ApiError');

// SERVICE DEPENDENCY
const {
	authuserService, 	// getAuthUser, getAuthUsers, deleteAuthUser, changePassword, toggleAbility
	authService, 		// addAuthUser
	tokenService, 		// deleteAuthUser
	joinedService,		// getAuthUsersJoined
} = require('../services');



const addAuthUser = asyncHandler(async (req, res) => {
	try {
		const { email, password } = req.body;
	
		const authuser = await authService.signupWithEmailAndPassword(email, password);
	
		// no need to generate tokens since the user is going to login self
	
		res.status(httpStatus.CREATED).send({ user: authuser.filter() });
		
	} catch (error) {
		throw locateError(error, "AuthUserController : addAuthUser");
	}
});



const getAuthUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		// the service checks the param id refers any valid authuser
		const authuser = await authuserService.getAuthUserById(id);
	
		res.status(httpStatus.OK).send(authuser.filter());
		
	} catch (error) {
		throw locateError(error, "AuthUserController : getAuthUser");
	}
});



const getAuthUsers = asyncHandler(async (req, res) => {
	try {
		const query = req.query;
	
		const result = await authuserService.getAuthUsers(query);
		
		res.status(httpStatus.OK).send(result);
		
	} catch (error) {
		throw locateError(error, "AuthUserController : getAuthUsers");
	}
});



const getAuthUsersJoined = asyncHandler(async (req, res) => {
	try {
		const query = req.query;
	
		const result = await joinedService.getAuthUsersJoined(query);
		
		res.status(httpStatus.OK).send(result);
		
	} catch (error) {
		throw locateError(error, "AuthUserController : getAuthUsersJoined");
	}
});



const changePassword = asyncHandler(async (req, res) => {
	try {
		const newPassword = req.body.password;
		const authuser = req.user;
	
		await authuserService.changePassword(authuser, newPassword);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthUserController : changePassword");
	}
});



const toggleAbility = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		// the service checks the param id refers any valid authuser
		await authuserService.toggleAbility(id);
	  
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthUserController : toggleAbility");
	}
});



const deleteAuthUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		// the service checks the param id refers any valid authuser
		await authuserService.deleteAuthUser(id);
		
		// delete all tokens,
		await tokenService.removeTokens({ user: id });
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthUserController : deleteAuthUser");
	}
});




module.exports = {
	addAuthUser,
	getAuthUser,
	getAuthUsers,
	getAuthUsersJoined,
	changePassword,
	toggleAbility,
	deleteAuthUser,
};