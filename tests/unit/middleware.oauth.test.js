const httpMocks = require('node-mocks-http');

// without the express app which is actually not necessary, the tests stucks, I don't know the reason
const app = require('../../src/core/express');

const { oAuth } = require('../../src/middlewares');
const { authProviders, redisService } = require('../../src/services');
const { ApiError } = require('../../src/utils/ApiError');

const { setupRedis } = require('../setup/setupRedis');


setupRedis();


describe('oAuth Middleware', () => {

	describe('Failed Authentications with oAuth handled by passport', () => {

		test('should throw error, if no headers.authorization', async () => {

			const req = httpMocks.createRequest();
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await oAuth("google")(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			// the error comes from the passport bearer strategy
			expect(err.statusCode).toBe(400);
			expect(err.name).toBe("ApiError");
			expect(err.message).toContain("Badly formed Authorization Header with Bearer.");
		});


		test('should throw error, if the authorization header is composed in bad format', async () => {

			const requestHeader = { headers: { Authorization: `Bearer ` } };

			const req = httpMocks.createRequest(requestHeader);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await oAuth("facebook")(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			// the error comes from the passport bearer strategy
			expect(err.statusCode).toBe(400);
			expect(err.name).toBe("ApiError");
			expect(err.message).toContain("Badly formed Authorization Header with Bearer.");
		});

	});


	describe('Failed Authentications with oAuth handled by providers', () => {

		test('should throw error, if attached id-token is invalid (google)', async () => {

			const google_id_token = "the-id-token-coming-from-google"; // invalid token
							
			const requestHeader = { headers: { Authorization: `Bearer ${google_id_token}` } };

			const req = httpMocks.createRequest(requestHeader);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await oAuth("google")(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			// the error comes from the package 'google-auth-library' in authProvider.google
			expect(err.statusCode).toBe(401);
			expect(err.name).toBe("ApiError");
			expect(err.message).toEqual(`Wrong number of segments in token: ${google_id_token}`);
		});


		test('should throw error, if attached access-token is invalid (facebook)', async () => {

			const facebook_access_token = "the-access-token-coming-from-facebook"; // invalid token
							
			const requestHeader = { headers: { Authorization: `Bearer ${facebook_access_token}` } };

			const req = httpMocks.createRequest(requestHeader);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await oAuth("facebook")(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			// the error comes from the facebook
			expect(err.statusCode).toBe(401);
			expect(err.name).toBe("ApiError");
			expect(err.message).toEqual(`Request failed with status code 400`);
		});


		test('should throw error, if the oAuth info returned by provider does not give identification (google)', async () => {

			const provider = "google";
			const google_id_token = "the-id-token-coming-from-google";
				
			const customImplementation = () => ({ provider, user: { id: undefined, email: undefined} });
			const spyOnGoogle = jest.spyOn(authProviders, 'google').mockImplementation(customImplementation);
			
			const requestHeader = { headers: { Authorization: `Bearer ${google_id_token}` } };

			const req = httpMocks.createRequest(requestHeader);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await oAuth("google")(req, res, next);

			expect(spyOnGoogle).toHaveBeenCalledWith(google_id_token);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			// the error comes from the facebook
			expect(err.statusCode).toBe(401);
			expect(err.name).toBe("ApiError");
			expect(err.message).toContain(`${provider} oAuth token could not be associated with any identification.`);
			
			expect(req.oAuth).toBeFalsy();
		});


		test('should throw error, if the oAuth info returned by provider does not give email info (facebook)', async () => {

			const provider = "facebook";
			const facebook_access_token = "the-access-token-coming-from-facebook";
				
			const customImplementation = () => ({ provider, user: { id: "284698243598294598745", email: undefined} });
			const spyOnGoogle = jest.spyOn(authProviders, 'facebook').mockImplementation(customImplementation);
			
			const requestHeader = { headers: { Authorization: `Bearer ${facebook_access_token}` } };

			const req = httpMocks.createRequest(requestHeader);
			const res = httpMocks.createResponse();
			const next = jest.fn();
			
			await oAuth("facebook")(req, res, next);

			expect(spyOnGoogle).toHaveBeenCalledWith(facebook_access_token);
			expect(next).toHaveBeenCalledWith(expect.any(ApiError));
			
			// obtain the error from the next function
			const err = next.mock.calls[0][0];

			// the error comes from the facebook
			expect(err.statusCode).toBe(401);
			expect(err.name).toBe("ApiError");
			expect(err.message).toContain(`${provider} oAuth token does not contain necessary email information.`);
			
			expect(req.oAuth).toBeFalsy();
		});
	});



	describe('Success Authentication with oAuth', () => {

		beforeEach(() => {
			jest.clearAllMocks();
		});
		
		test('should continue next middleware with oAuth attached to the request (google)', async () => {

			const authuser = { id: "123456789012345678901234", email: "talat@gmail.com" };

			const provider = "google";
			const google_id_token = "the-id-token-coming-from-google";

			const customImplementation = () => ({ provider, user: authuser });
			const spyOnGoogle = jest.spyOn(authProviders, 'google').mockImplementation(customImplementation);
			const spyOnRedisCheck = jest.spyOn(redisService, 'check_jti_in_blacklist').mockImplementation(()=>false);
			const spyOnRedisPut = jest.spyOn(redisService, 'put_jti_into_blacklist').mockImplementation(()=>true);

			const requestHeader = { headers: { Authorization: `Bearer ${google_id_token}` } };

			const req = httpMocks.createRequest(requestHeader);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await oAuth("google")(req, res, next);

			expect(spyOnGoogle).toHaveBeenCalledWith(google_id_token);
			expect(spyOnRedisCheck).toHaveBeenCalledWith(google_id_token);
			expect(spyOnRedisPut).toHaveBeenCalledWith(google_id_token);
			expect(next).toHaveBeenCalledWith();
			expect(req.oAuth).toEqual({
				"provider": provider,
				"user": authuser,
				"token": google_id_token,
			});
		});


		test('should continue next middleware with oAuth attached to the request (facebook)', async () => {

			const authuser = { id: "123456789012345678901234", email: "talat@gmail.com" };

			const provider = "facebook";
			const facebook_access_token = "the-access-token-coming-from-facebook";

			const customImplementation = () => ({ provider, user: authuser });
			const spyOnFacebook = jest.spyOn(authProviders, "facebook").mockImplementation(customImplementation);
			const spyOnRedisCheck = jest.spyOn(redisService, 'check_jti_in_blacklist').mockImplementation(()=>false);
			const spyOnRedisPut = jest.spyOn(redisService, 'put_jti_into_blacklist').mockImplementation(()=>true);

			const requestHeader = { headers: { Authorization: `Bearer ${facebook_access_token}` } };

			const req = httpMocks.createRequest(requestHeader);
			const res = httpMocks.createResponse();
			const next = jest.fn();

			await oAuth("facebook")(req, res, next);

			expect(spyOnFacebook).toHaveBeenCalledWith(facebook_access_token);
			expect(spyOnRedisCheck).toHaveBeenCalledWith(facebook_access_token);
			expect(spyOnRedisPut).toHaveBeenCalledWith(facebook_access_token);
			expect(next).toHaveBeenCalledWith();
			expect(req.oAuth).toEqual({
				"provider": provider,
				"user": authuser,
				"token": facebook_access_token,
			});
		});
	});
})