const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');
const Utils = require('../utils/Utils');
const { tokenService, authService, authuserService, userService } = require('../services');


const getUsers = asyncHandler(async (req, res) => {
  const DEFAULT_PAGE_SIZE = 20;
  const DEFAULT_PAGE = 1;

  const filter = Utils.pick(req.query, ['email', 'role', 'isEmailVerified', 'disabled']);
  const filterLeft = Utils.parseBooleans(filter, ['isEmailVerified', 'disabled']);

  const filterRight = Utils.pick(req.query, ['name', 'country', 'gender']);

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
  const user = await userService.getUserById(req.params.id);
  res.status(httpStatus.OK).send(user.userfilter());
});


const addUser = asyncHandler(async (req, res) => {
	const {email, password, role, name, gender, country} = req.body;
	let user = await authService.signupWithEmailAndPassword(email, password);
	await authuserService.updateAuthUserById(user.id, {role});
	await userService.updateUserById(user.id, {name, gender, country});
	
	user = await userService.getUserById(user.id);
	res.send(user.userfilter());
});


const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUserById(req.params.id, req.body);
  res.send(user.userfilter());
});


const deleteUser = asyncHandler(async (req, res) => {
  const id = req.params.id;

  await tokenService.removeTokens({ user: id});
  const deletedUser = await userService.deleteUserById(id); //order is matter, first
  await authuserService.deleteAuthUserById(id); //order is matter, second
  await userService.addUserToDeletedUsers(deletedUser);

  res.status(httpStatus.NO_CONTENT).send();
});


const changeRole = asyncHandler(async (req, res) => {
	const id = req.params.id;
	const role = req.body.role
	await userService.changeUserRole(id, role);
  
	res.status(httpStatus.NO_CONTENT).send();
});


const setAbility = asyncHandler(async (req, res) => {
	const id = req.params.id;
	await userService.toggleAbilityOfUser(id);
  
	res.status(httpStatus.NO_CONTENT).send();
});


module.exports = {
  getUsers,
  getUser,
  addUser,
  updateUser,
  deleteUser,
  changeRole,
  setAbility
};
