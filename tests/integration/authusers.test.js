const request = require('supertest');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');

const app = require('../../src/core/express');

const { authuserService, userService, authuserDbService } = require('../../src/services');
const { AuthUser } = require('../../src/models');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('PATH /authusers', () => {

	const userAgent = "from-jest-test";
	let adminAccessToken, adminAuthuserId;
	const localDb = {}; // reflects the database authusers collection

	jest.setTimeout(50000);

	beforeEach(async () => {
		// create an authuser
		const response = await request(app).post('/auth/signup')
			.set('User-Agent', userAgent)
			.send({
				email: 'admin@gmail.com',
				password: 'Pass1word!',
				passwordConfirmation: 'Pass1word!'
			});

		adminAccessToken = response.body.tokens.access.token;
		adminAuthuserId = response.body.user.id; // used in below test

		const adminAuthuser = response.body.user;

		// add admin authusers to localDb
		localDb[adminAuthuser.email] = adminAuthuser;

		// create an admin user correspondent with the authuser
		await userService.addUser(adminAuthuser.id, { email: adminAuthuser.email, role: "admin",  name: "Mr.Admin"});
	});


	describe('The success scenario for the authusers', () => {

		/*
		The Success Test Scenario
		-------------------------
		- add an authuser
		- check its properties and the password is hashed
		- add 10 authusers
		- check random 8th authuser exists in db
		- get all authusers and check the count
		- update even ones as disabled, toggleAbility
		- update 5th and 10th as email verified
		- delete 3th, 6th and 9th
		- control the 3th, 6th and 9th authusers are in the deletedauthusers
		- get an authuser, check the data
		- query filter disabled, check the count; and control the list
		- query filter not disabled and email not verified; and check the count; and control the list
		- check the paginations, get iterations and check the counts and pagination infos
		- change own password, check the password is hashed
		*/

		test('success scenario', async () => {
			let response, data, authuser;
			const authusers = []; // holds the static data of the 10 authusers to be created

			const addForm = {
				email: "test@gmail.com",
				password: "Pass1word!",
				passwordConfirmation: "Pass1word!"
			};

			// add an authuser
			response = await request(app)
				.post('/authusers')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send(addForm);

			const testAuthuser = response.body;

			// check the testAuthuser created above
			expect(response.status).toBe(httpStatus.CREATED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body).not.toHaveProperty("tokens");
			expect(testAuthuser).not.toHaveProperty("password");
			expect(testAuthuser).toEqual({
				id: expect.any(String),
				email: addForm.email,
				isEmailVerified: false,
				isDisabled: false,
				createdAt: expect.any(Number),
				services: { emailpassword: "registered"}
			});

			// check the test authuser's password is hashed
			const { password } = await authuserDbService.getAuthUser({ id: testAuthuser.id});
			data = await bcrypt.compare(addForm.password, password);
			expect(data).toBeTruthy();

			// add test authuser to localDb
			localDb[testAuthuser.email] = testAuthuser;

			// add ten authusers
			for (let i=1; i<=10; i++) {
				response = await request(app)
					.post('/authusers')
					.set('User-Agent', userAgent) 
					.set('Authorization', `Bearer ${adminAccessToken}`)
					.send({
						email: `user${i}@gmail.com`,
						password: "Pass1word!",
						passwordConfirmation: "Pass1word!"
					});

				authusers.push(response.body);
				localDb[response.body.email] = response.body;
			}
			
			// check random 8th authuser exists in db
			data = await authuserService.isExist(localDb["user8@gmail.com"].id, "user8@gmail.com");
			expect(data).toBeTruthy();

			// get all authusers and check the count
			response = await request(app)
				.get('/authusers')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.users.length).toBe(12); // including admin and test authusers
			expect(authusers.length).toBe(10);

			// update even ones as disabled, toggleAbility
			for (let i=1; i<=10; i++) {
			  if (i%2===0) {
				await request(app)
					.put(`/authusers/${authusers[i-1]["id"]}`)
					.set('User-Agent', userAgent) 
					.set('Authorization', `Bearer ${adminAccessToken}`)
					.send()
					.expect(httpStatus.NO_CONTENT);

				localDb[authusers[i-1]["email"]].isDisabled = true;
			  }
			}

			// update 5th and 10th as email verified
			for (let i=1; i<=10; i++) {
			  if (i%5===0) {
				await authuserDbService.updateAuthUser(authusers[i-1]["id"], { isEmailVerified: true })
				localDb[authusers[i-1]["email"]].isEmailVerified = true;
			  }
			}

			// delete 3th, 6th and 9th
			for (let i=1; i<=10; i++) {
			  if (i%3===0) {
				await request(app)
					.delete(`/authusers/${authusers[i-1]["id"]}`)
					.set('User-Agent', userAgent) 
					.set('Authorization', `Bearer ${adminAccessToken}`)
					.send()
					.expect(httpStatus.NO_CONTENT);

				delete localDb[authusers[i-1]["email"]];
			  }
			}

			// control the 3th, 6th and 9th authusers are in the deletedauthusers
			authuser = await authuserService.getDeletedAuthUserById(authusers[8]["id"]);
			expect(authuser).toBeDefined();
			authuser = await authuserService.getDeletedAuthUserById(authusers[5]["id"]);
			expect(authuser).toBeDefined();
			authuser = await authuserService.getDeletedAuthUserById(authusers[2]["id"]);
			expect(authuser.deletedAt).toEqual(expect.any(Number));

			// get all authusers
			response = await request(app)
				.get('/authusers')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send()
				.expect(httpStatus.OK);

			// check the last added one is the first authuser, the default sort is descending createdAt
			expect(response.body.users.length).toBe(9);
			expect(response.body.users[0]["email"]).toBe("user10@gmail.com");

			// check localDb is equal to db result
			const arraysort = (a,b)=>a.createdAt-b.createdAt;
			expect(response.body.users.sort(arraysort)).toEqual(Object.values(localDb).sort(arraysort));

			// check the pagination
			expect(response.body.totalCount).toBe(9); // 3 of the authusers are deleted
			expect(response.body.pagination).toEqual({
				currentPage: 1,
				totalPages: 1,
				perPage: 20,
			});

			// get an authuser (10th)
			response = await request(app)
				.get(`/authusers/${authusers[9]["id"]}`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			// check the authuser data
			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body).not.toHaveProperty("password");
			expect(response.body).toEqual({
				id: authusers[9]["id"],
				email: authusers[9]["email"],
				isEmailVerified: true,
				isDisabled: true,
				createdAt: expect.any(Number),
				services: { emailpassword: "registered"}
			});

			// query filter disabled, check the count; and control the list
			response = await request(app)
				.get('/authusers')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ isDisabled: true, sort: "createdAt.asc" })
				.send()
				.expect(httpStatus.OK);
			
			expect(response.body.users.length).toBe(4);
			expect(response.body.users[0]["email"]).toBe("user2@gmail.com");
			expect(response.body.users[1]["email"]).toBe("user4@gmail.com");
			expect(response.body.users[2]["email"]).toBe("user8@gmail.com");
			expect(response.body.users[3]["email"]).toBe("user10@gmail.com");

			// check the pagination
			expect(response.body.totalCount).toBe(4); // 5 were disabled but one deleted
			expect(response.body.pagination).toEqual({
				currentPage: 1,
				totalPages: 1,
				perPage: 20,
			});


			// query filter not disabled and email not verified; and check the count; and control the list
			response = await request(app)
				.get('/authusers')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ isDisabled: false, isEmailVerified: false, sort: "email", size: 2 })
				.send()
				.expect(httpStatus.OK);

			expect(response.body.users.length).toBe(2);
			expect(response.body.users[0]["email"]).toBe("admin@gmail.com");
			expect(response.body.users[1]["email"]).toBe("test@gmail.com");

			// check the pagination
			expect(response.body.totalCount).toBe(4); // 5 were disabled but one deleted
			expect(response.body.pagination).toEqual({
				currentPage: 1,
				totalPages: 2,
				perPage: 2,
			});

			// get the second page
			response = await request(app)
				.get('/authusers')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ isDisabled: false, isEmailVerified: false, sort: "email", size: 2, page: 2 })
				.send()
				.expect(httpStatus.OK);

			expect(response.body.users.length).toBe(2);
			expect(response.body.users[0]["email"]).toBe("user1@gmail.com");
			expect(response.body.users[1]["email"]).toBe("user7@gmail.com");

			// check the pagination
			expect(response.body.totalCount).toBe(4); // 5 were disabled but one deleted
			expect(response.body.pagination).toEqual({
				currentPage: 2,
				totalPages: 2,
				perPage: 2,
			});

			// change own password
			const newPassword = "Pass1word+";
			response = await request(app)
				.patch(`/authusers/password`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({
					currentPassword: "Pass1word!",
					password: newPassword,
					passwordConfirmation: newPassword
				})
				.expect(httpStatus.NO_CONTENT);

			// check the admin authuser's new password is hashed
			const { password: hashedPassword } = await authuserDbService.getAuthUser({ id: adminAuthuserId });
			data = await bcrypt.compare(newPassword, hashedPassword);
			expect(data).toBeTruthy();
	  	});
	});



	describe('The failure scenario for the authusers', () => {
		/*
		The Failure Test Scenario
		--------------------------
		- add an authuser
		- try to add another authuser with the same email, get the error
		- try to get an authuser with invalid id
		- try to get an authuser that not exists
		- try to get authusers with wrong parameters
		- try to disable an authuser that not exists
		- try to delete an authuser that not exists
		- try to change another authuser's password
		- try to change password with validation errors
		*/

		function apiErrorExpectations(response, status) {
			expect(response.status).toBe(status);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(status);
			expect(response.body).toHaveProperty("description");
			expect(response.body).not.toHaveProperty("errors");
		}

		function validationErrorExpectations(response) {
			expect(response.status).toBe(httpStatus.UNPROCESSABLE_ENTITY);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.code).toEqual(422);
			expect(response.body.name).toEqual("ValidationError");
			expect(response.body.message).toEqual("The request could not be validated");
			expect(response.body).not.toHaveProperty("description");
		}

		test('failure scenario', async () => {
			let response;

			const addForm = {
				email: "test@gmail.com",
				password: "Pass1word!",
				passwordConfirmation: "Pass1word!"
			};

			// add an authuser
			await request(app)
				.post('/authusers')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send(addForm)
				.expect(httpStatus.CREATED);

			// try to add another authuser with the same email, get the error
			response = await request(app)
				.post('/authusers')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send(addForm);

			validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ email: ["email is already taken"]});

			// try to get an authuser with invalid id
			response = await request(app)
				.get('/authusers/1234567890')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ id: ["The param id must be a 24-character number"]});

			// try to get an authuser that not exists
			response = await request(app)
				.get('/authusers/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			apiErrorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toBe("No user found");

			// try to get authusers with wrong parameters
			response = await request(app)
				.get('/authusers')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ page: "a",  size: "b"})
				.send();

			validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ 
				page: ["The query param 'page' must be numeric value"],
				size: ["The query param 'size' must be numeric value"],
			});

			// try to disable an authuser that not exists
			response = await request(app)
				.put('/authusers/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			apiErrorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toBe("No user found");

			// try to delete an authuser that not exists
			response = await request(app)
				.delete('/authusers/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			apiErrorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toBe("No user found");

			// try to change another authuser's password
			// there is no route for that action, so only own password

			// try to change password with validation errors
			response = await request(app)
				.patch(`/authusers/password`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({
					currentPassword: "Pass1word",
					password: "invalid",
					passwordConfirmation: "nomatch"
				})

			validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ 
				currentPassword: ["incorrect current password"],
				password: ["password must be minimum 8 characters"],
				passwordConfirmation: ["password confirmation does not match with the password"]
			});
		});

	});
});