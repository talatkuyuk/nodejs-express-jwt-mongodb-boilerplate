const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const { traceError } = require('../utils/errorUtils');

// SERVICE DEPENDENCIES
const { authuserService, tokenService } = require('../services');



const addAuthUser = asyncHandler(async (req, res) => {
	try {
		const { email, password } = req.body;
	
		const authuser = await authuserService.addAuthUser(email, password);
	
		// no need to generate tokens since the user is going to login self
	
		res.location(`${req.protocol}://${req.get('host')}/authusers/${authuser.id}`);
		res.status(httpStatus.CREATED).send(authuser.filter());
		
	} catch (error) {
		throw traceError(error, "AuthUserController : addAuthUser");
	}
});



const getAuthUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		const authuser = await authuserService.getAuthUserById(id);
	
		res.status(httpStatus.OK).send(authuser.filter());
		
	} catch (error) {
		throw traceError(error, "AuthUserController : getAuthUser");
	}
});



const getAuthUsers = asyncHandler(async (req, res) => {
	try {
		const query = req.query;
	
		const result = await authuserService.getAuthUsers(query);
		
		res.status(httpStatus.OK).send(result);
		
	} catch (error) {
		throw traceError(error, "AuthUserController : getAuthUsers");
	}
});



const changePassword = asyncHandler(async (req, res) => {
	try {
		const newPassword = req.body.password;
		const authuser = req.authuser;
	
		await authuserService.changePassword(authuser.id, newPassword);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw traceError(error, "AuthUserController : changePassword");
	}
});



const toggleAbility = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		await authuserService.toggleAbility(id);

		// TODO: consider deleting the all tokens of the authuser after disabling
	  
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw traceError(error, "AuthUserController : toggleAbility");
	}
});



const deleteAuthUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		await authuserService.deleteAuthUser(id);
		
		await tokenService.removeTokens({ user: id });
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw traceError(error, "AuthUserController : deleteAuthUser");
	}
});



module.exports = {
	addAuthUser,
	getAuthUser,
	getAuthUsers,
	changePassword,
	toggleAbility,
	deleteAuthUser,
};