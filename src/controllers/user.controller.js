const { status: httpStatus } = require("http-status");
const asyncHandler = require("express-async-handler");

const { traceError } = require("../utils/errorUtils");

// SERVICE DEPENDENCIES
const { userService } = require("../services");

const success = { success: true };

const addUser = asyncHandler(
  /**
   * @typedef {import("../services/user.service").AddUserBody} AddUserBody
   *
   * @param {import('express').Request<{id: string}, any, AddUserBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const addBody = req.body;
      const id = req.params.id;

      const user = await userService.addUser(id, addBody);

      res.location(`${req.protocol}://${req.get("host")}/users/${user.id}`);
      res.status(httpStatus.CREATED).send({ success: true, data: { user: user.filter() } });
    } catch (error) {
      throw traceError(error, "UserController : addUser");
    }
  },
);

const getUser = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;

    // it is an option to get authuser self by the client
    const myid = id === "self" ? req.authuser.id : id;

    // the service checks the param id refers any valid user
    const user = await userService.getUserById(myid);

    res.status(httpStatus.OK).send({ success: true, data: { user: user.filter() } });
  } catch (error) {
    throw traceError(error, "UserController : getUser");
  }
});

/**
 * Controller to get users.
 */
const getUsers = asyncHandler(
  /**
   * @typedef {import("../services/user.service").UserQuery} UserQuery
   *
   * @param {import('express').Request<{}, any, any, UserQuery>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const query = req.query;

      const result = await userService.getUsers(query);

      res
        .status(httpStatus.OK)
        .send({
          success: true,
          data: {
            users: result.users.map((a) => a.filter()),
            pagination: result.pagination,
            totalCount: result.totalCount,
          },
        });
    } catch (error) {
      throw traceError(error, "UserController : getUsers");
    }
  },
);

const updateUser = asyncHandler(
  /**
   * @typedef {import("../services/user.service").UpdateUserBody} UpdateUserBody
   *
   * @param {import('express').Request<{id: string}, any, UpdateUserBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const id = req.params.id;
      const updateBody = req.body;

      const user = await userService.updateUser(id, updateBody);

      res.status(httpStatus.OK).send({ success: true, data: { user: user.filter() } });
    } catch (error) {
      throw traceError(error, "UserController : updateUser");
    }
  },
);

const changeRole = asyncHandler(
  /**
   * @typedef {Object} ChangeRoleBody
   * @property {"user"|"admin"} role
   * @property {string} password
   *
   * @param {import('express').Request<{id: string}, any, ChangeRoleBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const id = req.params.id;
      const { role } = req.body;

      await userService.updateUser(id, { role });

      res.status(httpStatus.OK).send(success);
    } catch (error) {
      throw traceError(error, "UserController : changeRole");
    }
  },
);

const deleteUser = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;

    await userService.deleteUser(id);

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "UserController : deleteUser");
  }
});

module.exports = { addUser, getUser, getUsers, updateUser, changeRole, deleteUser };
