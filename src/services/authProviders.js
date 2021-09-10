const {OAuth2Client} = require('google-auth-library');
const config = require('../config');


exports.google = async (idToken) => {
	const client = new OAuth2Client(config.google_client_id);

	const ticket = await client.verifyIdToken({
		idToken,
		audience: config.google_client_id,
	});

	return { provider: "google", payload: ticket.getPayload() };
};