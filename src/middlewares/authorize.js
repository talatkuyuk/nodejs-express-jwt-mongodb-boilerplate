/** @typedef {import('express').RequestHandler} RequestHandler */
/** @typedef {import('../models/user.model')} User */

const httpStatus = require("http-status");

const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");
const { userDbService } = require("../services");
const { roleRights } = require("../config/roles");

/**
 * It is a middleware; attaches the user into request and check the user role and authorization
 * @param {string | string[] | undefined} requiredRights
 * @returns {function}
 */

/**
 *
 * @param  {string[]} requiredRights
 * @returns {RequestHandler}
 */
const authorize =
  (...requiredRights) =>
  async (req, _res, next) => {
    try {
      if (!req.user && req.authuser) {
        const user = await userDbService.getUser({ id: req.authuser.id });

        if (user) req.user = user;
      }

      // if no requiredRights, the request has been granted what to do
      if (requiredRights.length === 0) return next();

      // if there is no user (forexample just after signup), set the role as "user"
      const role = req.user?.role ?? "user";

      const userRights = roleRights[role];

      if (!userRights) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have appropriate right");
      }

      const userRightsWithoutSelf = userRights.map((right) => right.split("@")[0]);

      requiredRights.forEach((requiredRight) => {
        const index = userRightsWithoutSelf.findIndex((right) => right === requiredRight);

        if (index === -1)
          throw new ApiError(httpStatus.FORBIDDEN, "You do not have appropriate right");

        // if no param.id, let it is handled by validator !!!, not here but take care in validator
        if (userRights[index].includes("self") && req.params && req.params.id)
          if (req.params.id !== "self" && req.params.id !== req.authuser?.id)
            throw new ApiError(httpStatus.FORBIDDEN, "You are authorized only your own data");
      });

      next();
    } catch (error) {
      next(traceError(error, "AuthorizeMiddleware : authorize"));
    }
  };

module.exports = authorize;
