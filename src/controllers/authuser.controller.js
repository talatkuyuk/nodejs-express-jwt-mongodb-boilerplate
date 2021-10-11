const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler')

// SERVICE DEPENDENCY
const {
	authService, 		// addAuthUser
	authuserService, 	// getAuthUser, getAuthUsers, deleteAuthUser, changePassword, toggleAbility
	tokenService, 		// deleteAuthUser
	joinedService,		// getAuthUsersJoined
} = require('../services');



const addAuthUser = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	const authuser = await authService.signupWithEmailAndPassword(email, password);

	// no need to generate tokens since the user is going to login self

	res.status(httpStatus.CREATED).send({ user: authuser.filter() });
});



const getAuthUser = asyncHandler(async (req, res) => {
	const id = req.params.id;

	// the service checks the param id refers any valid authuser
	const authuser = await authuserService.getAuthUserById(id);

	res.status(httpStatus.OK).send(authuser.filter());
});



const getAuthUsers = asyncHandler(async (req, res) => {
	const query = req.query;

	const result = await authuserService.getAuthUsers(query);
	
	res.status(httpStatus.OK).send(result);
});



const getAuthUsersJoined = asyncHandler(async (req, res) => {
	const query = req.query;

	const result = await joinedService.getAuthUsersJoined(query);
	
	res.status(httpStatus.OK).send(result);
});



const changePassword = asyncHandler(async (req, res) => {
	const newPassword = req.body.password;
	const authuser = req.user;

	await authuserService.changePassword(authuser, newPassword);

	res.status(httpStatus.NO_CONTENT).send();
});



const toggleAbility = asyncHandler(async (req, res) => {
	const id = req.params.id;

	// the service checks the param id refers any valid authuser
	await authuserService.toggleAbility(id);
  
	res.status(httpStatus.NO_CONTENT).send();
});



// depend on tokenService because of token remove operation
const deleteAuthUser = asyncHandler(async (req, res) => {
	const id = req.params.id;

	// the service checks the param id refers any valid authuser
	await authuserService.deleteAuthUser(id);
	
	// delete all tokens,
	await tokenService.removeTokens({ user: id });

	res.status(httpStatus.NO_CONTENT).send();
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