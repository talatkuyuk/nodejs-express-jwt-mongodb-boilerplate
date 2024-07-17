const axios = require("axios").default;
const moment = require("moment");
const { OAuth2Client } = require("google-auth-library");

const config = require("../config");
const { traceError } = require("../utils/errorUtils");

/**
 * @typedef {"google"|"facebook"|"emailpassword"} AuthProvider
 *
 * @typedef {Object} ProviderIdendity
 * @property {string} id
 * @property {string} email
 *
 * @typedef {Object} AuthProviderResult
 * @property {AuthProvider} provider
 * @property {string} token
 * @property {number} expiresIn
 * @property {ProviderIdendity} identity
 *
 * @param {string} idtoken_or_code
 * @param {"token" | "code"} [method]
 * @returns {Promise<AuthProviderResult>}
 */
const google = async (idtoken_or_code, method) => {
  try {
    console.log("google in AuthProviders");
    console.log(idtoken_or_code);

    const client = new OAuth2Client(
      config.google_client_id,
      config.google_client_secret,
      "postmessage",
    );

    let idToken = idtoken_or_code;

    // if it is a google authorization code
    if (method === "code") {
      const tokenResponse = await client.getToken(idtoken_or_code);
      const { id_token } = tokenResponse.tokens;

      if (!id_token) throw new Error("Google token response doen't have id_token");

      idToken = id_token;
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.google_client_id,
    });

    const tokenPayload = ticket.getPayload();

    if (!tokenPayload) throw new Error("Google payload returned empty");

    const { sub: id, email, exp } = tokenPayload;

    if (!email) throw new Error("Google payload doesn't have email information");

    const expiresIn = exp - moment().unix(); // expires in: the difference

    /** @type {AuthProviderResult} */
    const google_response = {
      provider: "google",
      token: idToken,
      expiresIn,
      identity: { id, email },
    };

    console.log(google_response);

    return google_response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      error.message = "Auth provider connection error occured, try later";
    } else if (error instanceof Error) {
      if (method === "code" && error.message === "invalid_grant") {
        error.message = "The provided google authorization code is not valid";
      }

      if (method === "token" && error.message.includes("Wrong number of segments in token")) {
        error.message = "The provided google id token is not valid";
      }
    }

    throw traceError(error, "AuthProviders : google");
  }
};

/**
 * @param {string} access_token
 * @returns {Promise<AuthProviderResult>}
 */
const facebook = async (access_token) => {
  try {
    console.log("facebook in AuthProviders");
    console.log(access_token);

    const url = "https://graph.facebook.com/v11.0/me";
    const params = { access_token, fields: "id, email" };

    const response = await axios.get(url, { params });

    /** @type {{id: string, email: string}} */
    const { id, email } = response.data;

    const expiresIn = 60 * 60 * 24 * 60; // expires in: facebook tokens has long life aproximetly 60 days;

    /** @type {AuthProviderResult} */
    const facebook_response = {
      provider: "facebook",
      token: access_token,
      expiresIn,
      identity: { id, email },
    };

    console.log(facebook_response);

    return facebook_response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      error.message = "Auth provider connection error occured, try later";
    } else if (
      error instanceof Error &&
      error.message === "Request failed with status code 400"
    ) {
      error.message = "The provided facebook access token is not valid";
    }

    throw traceError(error, "AuthProviders : facebook");
  }
};

module.exports = {
  google,
  facebook,
};
