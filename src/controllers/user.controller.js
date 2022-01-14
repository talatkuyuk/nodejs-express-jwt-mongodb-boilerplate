const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const { traceError } = require('../utils/errorUtils');

// SERVICE DEPENDENCIES
const { userService } = require('../services');



const addUser = asyncHandler(async (req, res) => {
	try {
		const addBody = req.body;
		const id = req.params.id;
	
		const user = await userService.addUser(id, addBody);
	
		res.location(`${req.protocol}://${req.get('host')}/users/${user.id}`);
		res.status(httpStatus.CREATED).send(user.filter());
		
	} catch (error) {
		throw traceError(error, "UserController : addUser");
	}
});



const getUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id
	
		// the service checks the param id refers any valid user
		const user = await userService.getUserById(id);
		
		res.status(httpStatus.OK).send(user.filter());
		
	} catch (error) {
		throw traceError(error, "UserController : getUser");
	}
});



const getUsers = asyncHandler(async (req, res) => {
	try {
		const query = req.query;
	
		const result = await userService.getUsers(query);
		
		res.status(httpStatus.OK).send(result);
		
	} catch (error) {
		throw traceError(error, "UserController : getUsers");
	}
});



const updateUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
		const updateBody = req.body;

		const user = await userService.updateUser(id, updateBody);

		res.status(httpStatus.OK).send(user.filter());
		
	} catch (error) {
		throw traceError(error, "UserController : updateUser");
	}
});



const changeRole = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
		const role = req.body.role
	
		await userService.updateUser(id, { role });
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw traceError(error, "UserController : changeRole");
	}
});



const deleteUser = asyncHandler(async (req, res) => {
	try {
		const id = req.params.id;
	
		await userService.deleteUser(id);
	
		res.status(httpStatus.NO_CONTENT).send();
		
	} catch (error) {
		throw traceError(error, "UserController : deleteUser");
	}
});



module.exports = {
	addUser,
	getUser,
	getUsers,
	updateUser,
	changeRole,
	deleteUser,
};
