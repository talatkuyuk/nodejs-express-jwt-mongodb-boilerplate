const mailchimp = require("@mailchimp/mailchimp_marketing");

const { traceError } = require("../utils/errorUtils");
const config = require("../config");
const ApiError = require("../utils/ApiError");

mailchimp.setConfig({
  apiKey: config.mailchimp_apikey,
  server: config.mailchimp_server_prefix,
});

/**
 * Subscribe to Mailchimp
 * @param {string} email
 * @param {string} name
 * @returns {Promise<void>}
 */
const subscribe = async (email, name) => {
  try {
    const response = await mailchimp.lists.addListMember(config.mailchimp_audience_id, {
      email_address: email,
      status: "pending",
      merge_fields: {
        NAME: name,
      },
    });

    if ("detail" in response) {
      let message;

      switch (response.title) {
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

      throw new ApiError(response.status, message);
    }
  } catch (error) {
    // const parsedError = JSON.parse(error.response.error.text);

    throw traceError(error, "Mailchimp : subscribe");
  }
};

/**
 * Unsubscribe from Mailchimp
 * @param {string} email
 * @returns {Promise<void>}
 */
const unsubscribe = async (email) => {
  const response = await mailchimp.lists.deleteListMember(config.mailchimp_audience_id, email);

  if ("detail" in response) {
    throw new ApiError(response.status, response.detail);
  }
};

// const getAudience = async (email, name) => {
//   // TODO
// };

module.exports = {
  subscribe,
  unsubscribe,
  // getAudience,
};
