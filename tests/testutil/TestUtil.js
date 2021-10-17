const jwt = require('jsonwebtoken');
const moment = require('moment');
const {serializeError} = require('serialize-error');

const { tokenDbService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');
const { ApiError } = require('../../src/utils/ApiError');
const config = require('../../src/config');


class TestUtil {
	static MatchErrors = () => expect.extend({
		toBeMatchedWithError(received, expected) {

			// if the received error is not ApiError, convert it, since I set the expected to be ApiError for simplicity
			if (!(received instanceof ApiError))
				received = new ApiError(expected.statusCode, received);
		
			// Error objects have un-enumarated keys, so need to use serialize-error package.
			const sReceived = serializeError(received)
			const sExpected = serializeError(expected)

			const { name: rName, message: rMessage, statusCode: rCode } = sReceived;
			const { name: eName, message: eMessage, statusCode: eCode } = sExpected;

			const check = (r, e) => r === e || console.log(`Expected: ${e}\nReceived: ${r}`);

			const passName = check(rName, eName);
			const passMessage = check(rMessage, eMessage);
			const passCode = check(rCode, eCode);
			
			return { pass: passName && passMessage && passCode };
		},
	});


	static CheckTokenConsistency = (tokens, id) => {
		const accessToken = tokens.access.token;
		const refreshToken = tokens.refresh.token;

		const accessExpiration = tokens.access.expires;
		const refreshExpiration = tokens.refresh.expires;

		// access token verification and consistency check within the data
		const { sub, iat, exp, jti, type} = jwt.decode(accessToken, config.jwt.secret);
		expect(sub && iat && exp && jti && type).toBe(tokenTypes.ACCESS);
		expect(sub).toBe(id);
		expect(exp).toBe(moment(accessExpiration).unix());

		// refresh token verification and consistency check within the data
		const { sub: subx, iat:iatx, exp: expx, jti:jtix, type:typex} = jwt.decode(refreshToken, config.jwt.secret);
		expect(subx && iatx && expx && jtix && typex).toBe(tokenTypes.REFRESH);
		expect(subx).toBe(id);
		expect(expx).toBe(moment(refreshExpiration).unix());

		expect(moment(accessExpiration, moment.ISO_8601, true).isValid()).toBe(true);
		expect(moment(refreshExpiration, moment.ISO_8601, true).isValid()).toBe(true);
	}


	static ExpectedTokens = {
		"access": {
		  "token": expect.any(String),
		  "expires": expect.any(String), // ex. "2021-10-17T09:49:26.735Z"
		},
		"refresh": {
		  "token": expect.any(String),
		  "expires": expect.any(String), 
		},
	}


	static CheckRefreshTokenStoredInDB = async (response) => {
		// check the refresh token is stored into database
		const tokenDoc = await tokenDbService.getToken({
			user: response.body.user.id,
			token: response.body.tokens.refresh.token,
			expires: moment(response.body.tokens.refresh.expires).toDate(),
			type: tokenTypes.REFRESH,
		});
		expect(tokenDoc?.id).toBeDefined();
	}
}

module.exports =  TestUtil;