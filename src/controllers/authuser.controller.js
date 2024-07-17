const httpStatus = require("http-status");
const asyncHandler = require("express-async-handler");

const { traceError } = require("../utils/errorUtils");

// SERVICE DEPENDENCIES
const { authuserService, tokenService } = require("../services");

const success = { success: true };

const addAuthUser = asyncHandler(
  /**
   * @typedef {Object} AddAuthuserBody
   * @property {string} email
   * @property {string} password
   *
   * @param {import('express').Request<{}, any, AddAuthuserBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const authuser = await authuserService.addAuthUser(email, password);

      // no need to generate tokens since the user is going to login self

      res.location(`${req.protocol}://${req.get("host")}/authusers/${authuser.id}`);
      res.status(httpStatus.CREATED).send({
        success: true,
        data: {
          authuser: authuser.filter(),
        },
      });
    } catch (error) {
      throw traceError(error, "AuthUserController : addAuthUser");
    }
  },
);

const getAuthUser = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;

    console.log({ id, req: req.authuser.id });

    // it is an option to get authuser self by the client
    const myid = id === "self" ? req.authuser.id : id;

    const authuser = await authuserService.getAuthUserById(myid);

    res.status(httpStatus.OK).send({
      success: true,
      data: {
        authuser: authuser.filter(),
      },
    });
  } catch (error) {
    throw traceError(error, "AuthUserController : getAuthUser");
  }
});

/**
 * Controller to get authenticated users.
 */
const getAuthUsers = asyncHandler(
  /**
   * @typedef {import("../services/authuser.service").AuthuserQuery} AuthuserQuery
   *
   * @param {import('express').Request<{}, any, any, AuthuserQuery>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const query = req.query;

      const result = await authuserService.getAuthUsers(query);

      res.status(httpStatus.OK).send({
        success: true,
        data: {
          authusers: result.authusers.map((a) => a.filter()),
          pagination: result.pagination,
          totalCount: result.totalCount,
        },
      });
    } catch (error) {
      throw traceError(error, "AuthUserController : getAuthUsers");
    }
  },
);

const changePassword = asyncHandler(
  /**
   * @typedef {Object} ChangePasswordBody
   * @property {string} password
   *
   * @param {import('express').Request<{}, any, ChangePasswordBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { password: newPassword } = req.body;
      const authuser = req.authuser;

      await authuserService.changePassword(authuser.id, newPassword);

      res.status(httpStatus.OK).send(success);
    } catch (error) {
      throw traceError(error, "AuthUserController : changePassword");
    }
  },
);

const toggleAbility = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;

    await authuserService.toggleAbility(id);

    // TODO: consider deleting the all tokens of the authuser after disabling

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "AuthUserController : toggleAbility");
  }
});

const toggleVerification = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;

    await authuserService.toggleVerification(id);

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "AuthUserController : toggleVerification");
  }
});

const unlinkProvider = asyncHandler(
  /**
   * @typedef {Object} RequestQuery
   * @property {import("../services/authProviders").AuthProvider} provider
   *
   * @param {import('express').Request<{id: string}, any, any, RequestQuery>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const id = req.params.id;
      const { provider } = req.query;

      const authuser = await authuserService.unlinkProvider(id, provider);

      res.status(httpStatus.OK).send({
        success: true,
        data: {
          authuser: authuser.filter(),
        },
      });
    } catch (error) {
      throw traceError(error, "AuthUserController : unlinkProvider");
    }
  },
);

const deleteAuthUser = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;

    await authuserService.deleteAuthUser(id);

    await tokenService.removeTokens({ user: id });

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "AuthUserController : deleteAuthUser");
  }
});

module.exports = {
  addAuthUser,
  getAuthUser,
  getAuthUsers,
  changePassword,
  toggleAbility,
  toggleVerification,
  unlinkProvider,
  deleteAuthUser,
};
