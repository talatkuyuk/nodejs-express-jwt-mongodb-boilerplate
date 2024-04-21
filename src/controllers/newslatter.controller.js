const httpStatus = require("http-status");
const asyncHandler = require("express-async-handler");

const { traceError } = require("../utils/errorUtils");

// SERVICE DEPENDENCIES
const { mailchimp } = require("../services");

const subscribe = asyncHandler(async (req, res) => {
  try {
    const { email, name } = req.body;

    await mailchimp.subscribe(email, name);

    res.status(httpStatus.OK).send({ success: true });
  } catch (error) {
    throw traceError(error, "NewslatterController : subscribe");
  }
});

module.exports = {
  subscribe,
};
