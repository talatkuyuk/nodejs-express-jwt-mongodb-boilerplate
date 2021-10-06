const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

const Utils = require('../utils/Utils');

// SERVICE DEPENDENCY
const {
	authService, 		// addAuthUser
	authuserService, 	// changePassword, toggleAbility
	authuserDbService, 	// getAuthUser, getAuthUsers, deleteAuthUser
	tokenService 		// addAuthUser, deleteAuthUser
} = require('../services');



// depend on tokenService because of token generate operation
const addAuthUser = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	const authuser = await authService.signupWithEmailAndPassword(email, password);

	// no need to produce tokens since the user is going to login self

	res.status(httpStatus.CREATED).send({ user: authuser.filter() });
});



const getAuthUser = asyncHandler(async (req, res) => {
	const id = req.params.id;

	const authuser = await authuserDbService.getAuthUser({ id });

	res.status(httpStatus.OK).send(authuser.filter());
});



const getAuthUsers = asyncHandler(async (req, res) => {
	const DEFAULT_PAGE_SIZE = 20;
	const DEFAULT_PAGE = 1;

	const filterX = Utils.pick(req.query, ['email']);

	const filter0 = Utils.pick(req.query, ['isEmailVerified', 'isDisabled']);
	const filterY = Utils.parseBooleans(filter0, ['isEmailVerified', 'isDisabled']);

	const filter = {...filterX, ...filterY};

	const currentPage = parseInt(req.query.page) || DEFAULT_PAGE;
	const sort = Utils.pickSort(req.query);
	const limit = parseInt(req.query.size) || DEFAULT_PAGE_SIZE;
	const skip = (currentPage - 1) * limit; 
	
	console.log(filter, sort, skip, limit);
	const result = await authuserDbService.getAuthUsers(filter, sort, skip, limit);

	let totalCount;
	if (result[0]["totalCount"].length > 0)
		totalCount = result[0]["totalCount"] = result[0]["totalCount"][0]["count"];
	else
		totalCount = result[0]["totalCount"] = 0;

	const totalPages = Math.ceil(totalCount / limit);
	result[0]["pagination"] = { perPage: limit, currentPage, totalPages};

	res.status(httpStatus.OK).send(result[0]);
});



const changePassword = asyncHandler(async (req, res) => {
	const newPassword = req.body.password;
	const authuser = req.user;

	await authuserService.changePassword(authuser, newPassword);

	res.status(httpStatus.NO_CONTENT).send();
});



const toggleAbility = asyncHandler(async (req, res) => {
	const id = req.params.id;

	await authuserService.toggleAbility(id);
  
	res.status(httpStatus.NO_CONTENT).send();
});



// depend on tokenService because of token remove operation
const deleteAuthUser = asyncHandler(async (req, res) => {
	const id = req.params.id;

	// delete all tokens,
	await tokenService.removeTokens({ user: id });

	await authuserDbService.deleteAuthUser(id);
  
	res.status(httpStatus.NO_CONTENT).send();
});




module.exports = {
	addAuthUser,
	getAuthUser,
	getAuthUsers,
	changePassword,
	toggleAbility,
	deleteAuthUser,
};