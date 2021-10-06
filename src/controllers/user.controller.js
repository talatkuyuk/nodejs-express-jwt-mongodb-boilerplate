const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');

const Utils = require('../utils/Utils');

// SERVICE DEPENDENCY
const { userDbService } = require('../services');



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
	const DEFAULT_PAGE_SIZE = 20;
	const DEFAULT_PAGE = 1;

	const filter = Utils.pick(req.query, ['email', 'role', 'name', 'country', 'gender']);

	const currentPage = parseInt(req.query.page) || DEFAULT_PAGE;
	const sort = Utils.pickSort(req.query);
	const limit = parseInt(req.query.size) || DEFAULT_PAGE_SIZE;
	const skip = (currentPage - 1) * limit;
	
	console.log(filter, sort, skip, limit);
	const result = await userDbService.getUsers(filter, sort, skip, limit);

	let totalCount;
	if (result[0]["totalCount"].length > 0)
		totalCount = result[0]["totalCount"] = result[0]["totalCount"][0]["count"];
	else
		totalCount = result[0]["totalCount"] = 0;

	const totalPages = Math.ceil(totalCount / limit);
	result[0]["pagination"] = { perPage: limit, currentPage, totalPages};

	res.status(httpStatus.OK).send(result[0]);
});



const getUsersJoined = asyncHandler(async (req, res) => {
	const DEFAULT_PAGE_SIZE = 20;
	const DEFAULT_PAGE = 1;

	const filter = Utils.pick(req.query, ['isEmailVerified', 'isDisabled']);
	const filterLeft = Utils.parseBooleans(filter, ['isEmailVerified', 'isDisabled']);

	const filterRight = Utils.pick(req.query, ['email', 'role', 'name', 'country', 'gender']);

	const currentPage = parseInt(req.query.page) || DEFAULT_PAGE;
	const sort = Utils.pickSort(req.query);
	const limit = parseInt(req.query.size) || DEFAULT_PAGE_SIZE;
	const skip = (currentPage - 1) * limit; 
	
	console.log(filterLeft, filterRight, sort, skip, limit);
	const result = await userDbService.getUsersJoined(filterLeft, filterRight, sort, skip, limit);

	let totalCount;
	if (result[0]["totalCount"].length > 0)
		totalCount = result[0]["totalCount"] = result[0]["totalCount"][0]["count"];
	else
		totalCount = result[0]["totalCount"] = 0;

	const totalPages = Math.ceil(totalCount / limit);
	result[0]["pagination"] = { perPage: limit, currentPage, totalPages};

	res.status(httpStatus.OK).send(result[0]);
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
