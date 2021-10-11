const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const Utils = require('../utils/Utils');

// SERVICE DEPENDENCY
const { userService, userDbService } = require('../services');



const addUser = asyncHandler(async (req, res) => {
	const {id, ...addBody} = req.body;

	const user = await userDbService.addUser(id, addBody);

	res.status(httpStatus.CREATED).send(user.filter());
});



const getUser = asyncHandler(async (req, res) => {
	const id = req.params.id

	const user = await userDbService.getUser(id);
	
	res.status(httpStatus.OK).send(user.filter());
});



const getUsers = asyncHandler(async (req, res) => {

	const query = req.query;

	const result = await userService.getUsers(query);
	
	res.status(httpStatus.OK).send(result);
});



const getUsersJoined = asyncHandler(async (req, res) => {
	const query = req.query;

	const result = await userService.getUsersJoined(query);
	
	res.status(httpStatus.OK).send(result);
});



const updateUser = asyncHandler(async (req, res) => {
	const id = req.params.id;
  	const {name, gender, country} = req.body;

  	const user = await userDbService.updateUser(id, {name, gender, country});

  	res.status(httpStatus.OK).send(user.filter());
});



const deleteUser = asyncHandler(async (req, res) => {
	const id = req.params.id;

	await userDbService.deleteUser(id);

	res.status(httpStatus.NO_CONTENT).send();
});



const changeRole = asyncHandler(async (req, res) => {
	const id = req.params.id;
	const role = req.body.role

	await userDbService.updateUser(id, {role});

	res.status(httpStatus.NO_CONTENT).send();
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
