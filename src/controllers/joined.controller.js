const { status: httpStatus } = require("http-status");

const { traceError } = require("../utils/errorUtils");

// SERVICE DEPENDENCIES
const { joinedService } = require("../services");

const getAuthUsersJoined =
  /**
   * @typedef {import("../services/authuser.service").AuthuserQuery} AuthuserQuery
   *
   * @param {import('express').Request<{}, any, any, AuthuserQuery>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const query = structuredClone(req.query);

      const result = await joinedService.getAuthUsersJoined(query);

      res.status(httpStatus.OK).send({ success: true, data: result });
    } catch (error) {
      throw traceError(error, "JoinedController : getAuthUsersJoined");
    }
  };

const getUsersJoined =
  /**
   * @typedef {import("../services/user.service").UserQuery} UserQuery
   *
   * @param {import('express').Request<{}, any, any, UserQuery>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const query = structuredClone(req.query);

      const result = await joinedService.getUsersJoined(query);

      res.status(httpStatus.OK).send({ success: true, data: result });
    } catch (error) {
      throw traceError(error, "UserController : getUsersJoined");
    }
  };

module.exports = { getAuthUsersJoined, getUsersJoined };
