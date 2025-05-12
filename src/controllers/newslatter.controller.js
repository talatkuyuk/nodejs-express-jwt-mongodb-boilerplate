const { status: httpStatus } = require("http-status");

const { traceError } = require("../utils/errorUtils");

// SERVICE DEPENDENCIES
const { mailchimp } = require("../services");

const subscribe =
  /**
   * @typedef {Object} SubscribeNewslatterBody
   * @property {string} email
   * @property {string} name
   *
   * @param {import('express').Request<{}, any, SubscribeNewslatterBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { email, name } = req.body;

      await mailchimp.subscribe(email, name);

      res.status(httpStatus.OK).send({ success: true });
    } catch (error) {
      throw traceError(error, "NewslatterController : subscribe");
    }
  };

module.exports = { subscribe };
