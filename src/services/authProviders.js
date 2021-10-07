const axios = require('axios');
const {OAuth2Client} = require('google-auth-library');

const config = require('../config');


const google = async (idToken) => {
	try {
		const client = new OAuth2Client(config.google_client_id);

		const ticket = await client.verifyIdToken({
			idToken,
			audience: config.google_client_id,
		});

		const {sub: id, email} = ticket.getPayload();
		return { provider: "google", user: {id, email} };

	} catch (error) {
		error.description || (error.description = "Google Provider failed in authProviders");
		throw error;
	}
};

const facebook = async (access_token) => {
	try {
		const url = 'https://graph.facebook.com/v11.0/me';
		const params = { access_token, fields: 'id, email' };

		const response = await axios.get(url, { params });

		const {id, email} = response.data;
		return { provider: "facebook", user: {id, email} };

	} catch (error) {
		error.description || (error.description = "Facebook Provider failed in authProviders");
		throw error;
	}
};

module.exports = {
	google,
	facebook
};