const request = require('supertest');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const app = require('../../src/core/express');

const { authuserDbService, authProviders } = require('../../src/services');
const { AuthUser } = require('../../src/models');

const TestUtil = require('../testutil/TestUtil');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('POST /auth/google & auth/facebook', () => {

	jest.setTimeout(50000);

	describe('Failed logins with AuthProvider', () => {

		function commonExpectations(response, status) {
			expect(response.status).toBe(status);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(status);
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		}


		test('should return status 401, if the oAuth provider (google) token is invalid', async () => {
			const google_id_token = "the-id-token-coming-from-google";

			const response = await request(app).post('/auth/google')
												.set('Authorization', `Bearer ${google_id_token}`) 
												.send();

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toEqual(`Wrong number of segments in token: ${google_id_token}`);
		});


		test('should return status 401, if the oAuth provider (facebook) token is invalid', async () => {
			const facebook_access_token = "the-access-token-coming-from-facebook";

			const response = await request(app).post('/auth/facebook')
												.set('Authorization', `Bearer ${facebook_access_token}`) 
												.send();

			commonExpectations(response, httpStatus.UNAUTHORIZED);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toEqual("Request failed with status code 400");
		});


		test('should return status 403, if the authuser is disabled', async () => {
			const authuser = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: await bcrypt.hash('Pass1word.', 8),
				isDisabled: true,
				services: {emailpassword: "registered"},
			});
			await authuserDbService.addAuthUser(authuser);

			const provider = "google";
			const google_id_token = "the-id-token-coming-from-google";
			const google_id = "365487263597623948576";
			const google_email = authuser.email;

			const customImplementation = () => ({ provider, user: { id: google_id, email: google_email } });
			jest.spyOn(authProviders, 'google').mockImplementation(customImplementation);

			const response = await request(app).post('/auth/google')
												.set('Authorization', `Bearer ${google_id_token}`) 
												.send();

			commonExpectations(response, httpStatus.FORBIDDEN);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toEqual("You are disabled, call the system administrator");

			const authuser_in_db = await authuserDbService.getAuthUser({ id: authuser.id });
			expect(authuser_in_db.services[provider]).toBeUndefined();
		});
	});



	describe('successful logins with AuthProvider', () => {

		beforeEach(() => {
			jest.clearAllMocks();
		});
		
		test('should return status 201; return the authuser and valid tokens in json form; successfully register if the user is not registered before', async () => {
			const userAgent = "from-jest-test";

			const provider = "google";
			const google_id_token = "the-id-token-coming-from-google";
			const google_id = "365487263597623948576";
			const google_email = "talat@gmail.com";

			const customImplementation = () => ({ provider, user: { id: google_id, email: google_email } });
			jest.spyOn(authProviders, 'google').mockImplementation(customImplementation);

			const response = await request(app).post('/auth/google')
												.set('Authorization', `Bearer ${google_id_token}`) 
												.set('User-Agent', userAgent)
												.send();

			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));

			const authuser = await authuserDbService.getAuthUser({ id: response.body.user.id });
			expect(authuser.services[provider]).toBeDefined();
			expect(authuser.password).toBeNull();

			TestUtil.CheckTokenConsistency(response.body.tokens, response.body.user.id);

			// check the whole response body expected
			expect(response.body).toEqual({
				"user": {
					"createdAt": expect.any(Number), // 1631868212022
					"email": google_email,
					"id": authuser.id.toString(),
					"isEmailVerified": true,
					"isDisabled": false,
					"services": {
					  "emailpassword": "not registered",
					  [provider]: google_id,
					},
				},
				"tokens": TestUtil.ExpectedTokens,
			});

			// check the refresh token is stored into database
			TestUtil.CheckRefreshTokenStoredInDB(response);
		});


		test('should return status 200; return the authuser and valid tokens in json form; successfully update services if the user is already registered before', async () => {

			const authuserDoc = AuthUser.fromObject({
				email: 'talat@gmail.com',
				password: await bcrypt.hash('Pass1word.', 8),
				isEmailVerified: false,
				services: {emailpassword: "registered"},
			});
			const authuser = await authuserDbService.addAuthUser(authuserDoc);

			const userAgent = "from-jest-test";
			
			const provider = "facebook";
			const facebook_access_token = "the-access-token-coming-from-facebook";
			const facebook_id = "365487263597623948576";
			const facebook_email = authuser.email;

			const customImplementation = () => ({ provider, user: { id: facebook_id, email: facebook_email } });
			jest.spyOn(authProviders, 'facebook').mockImplementation(customImplementation);

			const response = await request(app).post('/auth/facebook')
												.set('Authorization', `Bearer ${facebook_access_token}`) 
												.set('User-Agent', userAgent)
												.send();

			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));

			const authuser_in_db = await authuserDbService.getAuthUser({ id: authuser.id });
			expect(authuser_in_db.services["emailpassword"]).toBe("registered");
			expect(authuser_in_db.services[provider]).toBeDefined();

			TestUtil.CheckTokenConsistency(response.body.tokens, response.body.user.id);

			// check the whole response body expected
			expect(response.body).toEqual({
				"user": {
					"createdAt": expect.any(Number), // 1631868212022
					"email": authuser.email,
					"id": authuser.id.toString(),
					"isEmailVerified": true,
					"isDisabled": false,
					"services": {
					  "emailpassword": "registered",
					  [provider]: facebook_id,
					},
				},
				"tokens": TestUtil.ExpectedTokens,
			});

			// check the refresh token is stored into database
			TestUtil.CheckRefreshTokenStoredInDB(response);
		});
	});
})