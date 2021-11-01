const axios = require('axios');
const {OAuth2Client} = require('google-auth-library');

const config = require('../config');
const { locateError } = require('../utils/ApiError');


const google = async (idToken) => {
	try {
		const client = new OAuth2Client(config.google_client_id);

		const ticket = await client.verifyIdToken({
			idToken,
			audience: config.google_client_id,
		});

		const { sub: id, email, exp: expires } = ticket.getPayload();

		const google_response = {
			provider: "google",
			token: idToken,
			expires,
			user: { id, email }
		}

		return google_response;

	} catch (error) {
		throw locateError(error, "AuthProviders : google");
	}
};

const facebook = async (access_token) => {
	try {
		const url = 'https://graph.facebook.com/v11.0/me';
		const params = { access_token, fields: 'id, email' };

		const response = await axios.get(url, { params });

		const { id, email } = response.data;

		const facebook_response = {
			provider: "facebook",
			token: access_token,
			expires: 60 * 60 * 24 * 60, // facebook tokens has long life aproximetly 60 days
			user: { id, email }
		}

		return facebook_response;

	} catch (error) {
		throw locateError(error, "AuthProviders : facebook");
	}
};

module.exports = {
	google,
	facebook
};