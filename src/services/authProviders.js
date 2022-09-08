const axios = require("axios");
const moment = require("moment");
const { OAuth2Client } = require("google-auth-library");

const config = require("../config");
const { traceError } = require("../utils/errorUtils");

const google = async (idtoken_or_code, method) => {
  try {
    const client = new OAuth2Client(
      config.google_client_id,
      config.google_client_secret,
      "postmessage"
    );

    let idToken;

    // if it is a google id token
    if (method === "token") {
      idToken = idtoken_or_code;
    }

    // if it is a google authorization code
    if (method === "code") {
      console.log(idtoken_or_code);
      const code = idtoken_or_code;
      const response = await client.getToken(code);
      idToken = response.tokens.id_token;
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.google_client_id,
    });

    const { sub: id, email, exp } = ticket.getPayload();

    const expiresIn = exp - moment().unix(); // expires in: the difference

    const google_response = {
      provider: "google",
      token: idToken,
      expiresIn,
      user: { id, email },
    };

    console.log(google_response);

    return google_response;
  } catch (error) {
    if (method === "code" && error.message === "invalid_grant") {
      error.message = "The provided google authorization code is not valid";
    }

    if (
      method === "token" &&
      error.message.includes("Wrong number of segments in token")
    ) {
      error.message = "The provided google id token is not valid";
    }

    throw traceError(error, "AuthProviders : google");
  }
};

const facebook = async (access_token, method) => {
  try {
    const url = "https://graph.facebook.com/v11.0/me";
    const params = { access_token, fields: "id, email" };

    const response = await axios.get(url, { params });

    const { id, email } = response.data;

    const expiresIn = 60 * 60 * 24 * 60; // expires in: facebook tokens has long life aproximetly 60 days;

    const facebook_response = {
      provider: "facebook",
      token: access_token,
      expiresIn,
      user: { id, email },
    };

    return facebook_response;
  } catch (error) {
    if (error.message === "Request failed with status code 400") {
      error.message = "The provided facebook access token is not valid";
    }

    throw traceError(error, "AuthProviders : facebook");
  }
};

module.exports = {
  google,
  facebook,
};
