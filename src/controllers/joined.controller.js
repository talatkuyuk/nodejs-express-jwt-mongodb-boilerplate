const httpStatus = require("http-status");
const asyncHandler = require("express-async-handler");

const { traceError } = require("../utils/errorUtils");

// SERVICE DEPENDENCIES
const { joinedService } = require("../services");

const getAuthUsersJoined = asyncHandler(async (req, res) => {
  try {
    const query = req.query;

    const result = await joinedService.getAuthUsersJoined(query);

    res.status(httpStatus.OK).send({
      success: true,
      data: result,
    });
  } catch (error) {
    throw traceError(error, "JoinedController : getAuthUsersJoined");
  }
});

const getUsersJoined = asyncHandler(async (req, res) => {
  try {
    const query = req.query;

    const result = await joinedService.getUsersJoined(query);

    res.status(httpStatus.OK).send({
      success: true,
      data: result,
    });
  } catch (error) {
    throw traceError(error, "UserController : getUsersJoined");
  }
});

module.exports = {
  getAuthUsersJoined,
  getUsersJoined,
};
