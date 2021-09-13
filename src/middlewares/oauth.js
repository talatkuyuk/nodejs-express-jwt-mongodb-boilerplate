const passport = require('passport');
const axios = require('axios');

const {OAuth2Client} = require('google-auth-library');

const config = require('../config');


const oAuth = (service) => (req, res, next) => passport.authenticate(
	service, 
	{ session: false },
	function(err, user, info) {
		if (err) { return next(err); }

		//passport-authentication error
        if (!user) { return  next(new Error('Invalid-Formed Bearer Token. ' + (info ?? ""))); }
        
		next()
	}
)(req, res, next);


const google_oAuth = async (req, res, next) => {
	try {
		// expected google idToken as token in request body 
		const idToken = req.body.token;
		
		const client = new OAuth2Client(config.google_client_id);

		const ticket = await client.verifyIdToken({
			idToken,
			audience: config.google_client_id, // if multiple clients [id1, id2, ...]
		});

		const {sub: id, email} = ticket.getPayload();

		req.oAuth = { provider: "google", user: {id, email} };

		next();
	
	} catch (error) {
		next(error);
	}
}

const facebook_oAuth = async (req, res, next) => {
	try {
		// expected facebook access_token as token in request body 
		const access_token = req.body.token;

		const url = 'https://graph.facebook.com/v11.0/me';
		const params = { access_token, fields: 'id, email' };

		const response = await axios.get(url, { params });
		
		const {id, email} = response.data;

		req.oAuth = { provider: "facebook", user: {id, email} };

		next();
	
	} catch (error) {
		next(error);
	}
}

module.exports = { oAuth, google_oAuth, facebook_oAuth };
