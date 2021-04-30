const httpStatus = require('http-status');
const asyncHandler = require('express-async-handler');
const ObjectId = require('mongodb').ObjectId;

const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');

const { tokenService, authService, authuserService, userService } = require('../services');


const getUsers = asyncHandler(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.send(user.filter());
});

const addUser = asyncHandler(async (req, res) => {
	const {email, password, role, name, gender, country} = req.body;
	let user = await authService.signupWithEmailAndPassword(email, password);
	await authuserService.updateAuthUserById(user.id, {role});
	await userService.updateUserById(user.id, {name, gender, country});
	
	user = await userService.getUserById(user.id);
	res.send(user.filter());
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUserById(req.params.id, req.body);
  res.send(user.filter());
});

const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  await tokenService.removeTokens({ user: ObjectId(userId)});
  const deletedUser = await userService.deleteUserById(userId); //order is matter, first
  await authuserService.deleteAuthUserById(userId); //order is matter, second
  await userService.addUserToDeletedUsers(deletedUser);

  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getUsers,
  getUser,
  addUser,
  updateUser,
  deleteUser,
};
