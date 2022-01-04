const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const moment = require('moment');
const {serializeError} = require('serialize-error');

const { tokenService, tokenDbService, authuserDbService } = require('../../src/services');
const { tokenTypes } = require('../../src/config/tokens');
const { AuthUser } = require('../../src/models');
const ApiError = require('../../src/utils/ApiError');
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

			// const check = (r, e) => r === e;
			const check = (r, e) => {
				r !== e && console.log(`Expected: ${e}\nReceived: ${r}`);
				return r === e;
			}

			const passName = check(rName, eName);
			const passMessage = check(rMessage, eMessage);
			const passCode = check(rCode, eCode);

			const pass =  passName && passMessage && passCode;
			// const message = pass ? () => 'Error matched' : () => 'Error is not matched'
			
			return { pass };
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


	static errorExpectations = (response, status) => {
		expect(response.status).toBe(status);
		expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
		expect(response.body.code).toEqual(status);
		expect(response.body).toHaveProperty("description");
		expect(response.body).not.toHaveProperty("errors");
	}

	static validationErrorExpectations = (response) => {
		expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
		expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
		expect(response.body.code).toEqual(422);
		expect(response.body.name).toEqual("ValidationError");
		expect(response.body.message).toEqual("The request could not be validated");
		expect(response.body).not.toHaveProperty("description");
	}

	static validationErrorInMiddleware = (err) => {
		expect(err.statusCode).toBe(422);
		expect(err.name).toBe("ValidationError");
		expect(err.message).toEqual("The request could not be validated");
		expect(err.description).toBeNull();
	}

	static createAuthUser = async (email, password, userAgent) => {
		const authUserInstance = AuthUser.fromDoc({ email, password });

		const authuser = await authuserDbService.addAuthUser(authUserInstance);
		const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

		return { authuser, tokens }
	}

}

module.exports =  TestUtil;