const axios = require('axios');
const moment = require('moment');
const {OAuth2Client} = require('google-auth-library');

const config = require('../config');
const { locateError } = require('../utils/errorUtils');


const google = async (idToken) => {
	try {
		const client = new OAuth2Client(config.google_client_id);

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
			user: { id, email }
		}

		console.log(google_response)

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

		const expiresIn = 60 * 60 * 24 * 60; // expires in: facebook tokens has long life aproximetly 60 days;

		const facebook_response = {
			provider: "facebook",
			token: access_token,
			expiresIn,
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