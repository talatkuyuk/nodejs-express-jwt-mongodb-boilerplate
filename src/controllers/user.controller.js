const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const { locateError } = require('../utils/ApiError');

// SERVICE DEPENDENCY
const {
	userDbService,		// addUser, getUser, getUsers, updateUser, deleteUser, changeRole
	userService,		// getUsers
	joinedService,		// getUsersJoined
} = require('../services');



const addUser = asyncHandler(async (req, res) => {
	try {
		const {id, ...addBody} = req.body;
	
		const user = await userDbService.addUser(id, addBody);
	
		res.status(httpStatus.CREATED).send(user.filter());
		
	} catch (error) {
		throw locateError(error, "UserController : addUser");
	}
});



const getUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id
	
		const user = await userDbService.getUser(id);
		
		res.status(httpStatus.OK).send(user.filter());
		
	} catch (error) {
		throw locateError(error, "UserController : getUser");
	}
});



const getUsers = asyncHandler(async (req, res) => {
	try {
		const query = req.query;
	
		const result = await userService.getUsers(query);
		
		res.status(httpStatus.OK).send(result);
		
	} catch (error) {
		throw locateError(error, "UserController : getUsers");
	}
});



const getUsersJoined = asyncHandler(async (req, res) => {
	try {
		const query = req.query;
	
		const result = await joinedService.getUsersJoined(query);
		
		res.status(httpStatus.OK).send(result);
		
	} catch (error) {
		throw locateError(error, "UserController : getUsersJoined");
	}
});



const updateUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
		  const {name, gender, country} = req.body;
	
		  const user = await userDbService.updateUser(id, {name, gender, country});
	
		  res.status(httpStatus.OK).send(user.filter());
		
	} catch (error) {
		throw locateError(error, "UserController : updateUser");
	}
});



const deleteUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		await userDbService.deleteUser(id);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "UserController : deleteUser");
	}
});



const changeRole = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
		const role = req.body.role
	
		await userDbService.updateUser(id, {role});
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw locateError(error, "UserController : changeRole");
	}
});




module.exports = {
	addUser,
	getUser,
	getUsers,
	getUsersJoined,
	updateUser,
	deleteUser,
	changeRole
};
