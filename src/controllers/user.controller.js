const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');
const Utils = require('../utils/Utils');

const { userService } = require('../services');


const getUsers = asyncHandler(async (req, res) => {
	const DEFAULT_PAGE_SIZE = 20;
	const DEFAULT_PAGE = 1;

	const filter = Utils.pick(req.query, ['isEmailVerified', 'disabled']);
	const filterLeft = Utils.parseBooleans(filter, ['isEmailVerified', 'disabled']);

	const filterRight = Utils.pick(req.query, ['email', 'role', 'name', 'country', 'gender']);

	const currentPage = parseInt(req.query.page) || DEFAULT_PAGE;
	const sort = Utils.pickSort(req.query);
	const limit = parseInt(req.query.size) || DEFAULT_PAGE_SIZE;
	const skip = (currentPage - 1) * limit; 
	
	console.log(filterLeft, filterRight, sort, skip, limit);
	const result = await userService.queryUsers(filterLeft, filterRight, sort, skip, limit);

	let totalCount;
	if (result[0]["totalCount"].length > 0)
		totalCount = result[0]["totalCount"] = result[0]["totalCount"][0]["count"];
	else
		totalCount = result[0]["totalCount"] = 0;

	const totalPages = Math.ceil(totalCount / limit);
	result[0]["pagination"] = { perPage: limit, currentPage, totalPages};

	res.status(httpStatus.OK).send(result[0]);
});


const getUser = asyncHandler(async (req, res) => {
	const id = req.params.id

	const user = await userService.getUser(id);
	
	res.status(httpStatus.OK).send(user.userfilter());
});


const addUser = asyncHandler(async (req, res) => {
	const {id, ...addBody} = req.body;

	const user = await userService.addUser(id, addBody);

	res.status(httpStatus.CREATED).send(user.userfilter());
});


const updateUser = asyncHandler(async (req, res) => {
	const id = req.params.id;
  	const {name, gender, country} = req.body;

  	const user = await userService.updateUser(id, {name, gender, country});

  	res.status(httpStatus.OK).send(user.userfilter());
});


const deleteUser = asyncHandler(async (req, res) => {
	const id = req.params.id;

	await userService.deleteUser(id);

	res.status(httpStatus.NO_CONTENT).send();
});


const changeRole = asyncHandler(async (req, res) => {
	const id = req.params.id;
	const role = req.body.role

	await userService.updateUser(id, {role});

	res.status(httpStatus.NO_CONTENT).send();
});



module.exports = {
	getUsers,
	getUser,
	addUser,
	updateUser,
	deleteUser,
	changeRole
};
