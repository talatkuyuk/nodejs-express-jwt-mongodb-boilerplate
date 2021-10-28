const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const { locateError } = require('../utils/ApiError');

// SERVICE DEPENDENCIES
const {
	authuserService,
	tokenService, 	// deleteAuthUser
	joinedService,	// getAuthUsersJoined
} = require('../services');



const addAuthUser = asyncHandler(async (req, res) => {
	try {
		const { email, password } = req.body;
	
		const authuser = await authuserService.addAuthUser(email, password);
	
		// no need to generate tokens since the user is going to login self
	
		res.status(httpStatus.CREATED).send(authuser.filter());
		
	} catch (error) {
		throw locateError(error, "AuthUserController : addAuthUser");
	}
});



const getAuthUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
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
		const authuser = req.authuser;
	
		await authuserService.changePassword(authuser.id, newPassword);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthUserController : changePassword");
	}
});



const toggleAbility = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		await authuserService.toggleAbility(id);
	  
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "AuthUserController : toggleAbility");
	}
});



const deleteAuthUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		await authuserService.deleteAuthUser(id);
		
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