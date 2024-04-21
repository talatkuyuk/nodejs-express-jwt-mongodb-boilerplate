const mailchimp = require("@mailchimp/mailchimp_marketing");

const { traceError } = require("../utils/errorUtils");
const config = require("../config");
const ApiError = require("../utils/ApiError");

mailchimp.setConfig({
  apiKey: config.mailchimp_apikey,
  server: config.mailchimp_server_prefix,
});

/**
 * Check the key and return whether it is in Redis cache or not
 * @param {string} email
 * @param {string?} name
 * @returns {Promise<void>}
 */
const subscribe = async (email, name) => {
  try {
    await mailchimp.lists.addListMember(config.mailchimp_audience_id, {
      email_address: email,
      status: "pending",
      merge_fields: {
        NAME: name,
      },
    });
  } catch (error) {
    const parsedError = JSON.parse(error.response.error.text);

    let message;

    switch (parsedError.title) {
      case "Invalid Resource":
        message = "email is invalid";
        break;

      case "Member Exists":
        message = "email is already subscribed";
        break;

      default:
        message = "email subscription is failed";
        break;
    }

    const mailchimpError = new ApiError(parsedError.status, message);
    throw traceError(mailchimpError, "Mailchimp : subscribe");
  }
};

const unsubscribe = async (email, name) => {
  // TODO
};

const getAudience = async (email, name) => {
  // TODO
};

module.exports = {
  subscribe,
  unsubscribe,
  getAudience,
};
