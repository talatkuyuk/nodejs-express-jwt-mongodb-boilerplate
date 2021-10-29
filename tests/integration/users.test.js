const request = require('supertest');
const httpStatus = require('http-status');

const app = require('../../src/core/express');

const { userService } = require('../../src/services');

const TestUtil = require('../testutil/TestUtil');

const { setupTestDatabase } = require('../setup/setupTestDatabase');
const { setupRedis } = require('../setup/setupRedis');


setupTestDatabase();
setupRedis();


describe('PATH /users', () => {

	const userAgent = "from-jest-test";
	let adminAccessToken;
	const localDb = {}; // reflects the database users collection

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
		const adminAuthuser = response.body.user;

		// create an admin user correspondent with the authuser
		const adminUser = await userService.addUser(adminAuthuser.id, { email: adminAuthuser.email, role: "admin",  name: "Mr.Admin"});

		// add admin authusers to localDb
		localDb[adminUser.email] = {...adminUser};
	});


	describe('The success scenario for the users', () => {

		/*
		The Success Test Scenario
		-------------------------
		- add an authuser and user correspondent
		- check its properties and the password is hashed
		- add 10 authusers and 10 users correspondent
		- check random 8th user exists in db
		- get all users and check the count
		- update an authuser
		- delete 3th, 6th and 9th
		- control the 3th, 6th and 9th users are in the deletedusers
		- get an user, check the data
		- query filter, check the count; and control the list
		- check the paginations, get iterations and check the counts and pagination infos
		*/

		test('success scenario', async () => {
			let response, data, user;
			const authusers = []; // holds the static data of the 10 authusers to be created

			// add an authuser
			response = await request(app)
				.post('/authusers')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({
					email: "test@gmail.com",
					password: "Pass1word!",
					passwordConfirmation: "Pass1word!"
				})
				.expect(httpStatus.CREATED);

			const testAuthuser = response.body;

			const addForm = {
				email: testAuthuser.email,
				role: "user",
				name: "Mr.Test"
			};

			// add an user correspondent
			response = await request(app)
				.post(`/users/${testAuthuser.id}`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send(addForm);
			
			const testUser = response.body;

			// add test authuser to localDb
			localDb[testUser.email] = testUser;

			// check the testUser created above
			expect(response.status).toBe(httpStatus.CREATED);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(testUser).toEqual({
				id: testAuthuser.id,
				email: testAuthuser.email,
				role: "user",
				name: "Mr.Test",
				gender: null,
				country: null,
				createdAt: expect.any(Number),
			});

			// add ten authusers
			for (let i=1; i<=10; i++) {
				response = await request(app)
					.post('/authusers')
					.set('User-Agent', userAgent) 
					.set('Authorization', `Bearer ${adminAccessToken}`)
					.send({email: `user${i}@gmail.com`, password: "Pass1word!", passwordConfirmation: "Pass1word!"});

				authusers.push(response.body);
			}

			// add ten users correspondent
			for (let i=1; i<=10; i++) {
				response = await request(app)
					.post(`/users/${authusers[i-1]["id"]}`)
					.set('User-Agent', userAgent) 
					.set('Authorization', `Bearer ${adminAccessToken}`)
					.send({ 
						email: authusers[i-1]["email"],
						role: "user",
						name: `User-${i}`,
						gender: i%2===0?"female":"male",
						country: i%3==1?"USA":"TUR",
					});

				localDb[response.body.email] = response.body;
			}

			// check random 8th user exists in db
			data = await userService.isExist(localDb["user8@gmail.com"].id, "user8@gmail.com");
			expect(data).toBeTruthy();

			// get all users and check the count
			response = await request(app)
				.get('/users')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body.users.length).toBe(12); // including admin and test users

			// update some as country ITA
			for (let i=1; i<=10; i++) {
			  if (i%5===0) {
				response = await request(app)
					.put(`/users/${authusers[i-1]["id"]}`)
					.set('User-Agent', userAgent) 
					.set('Authorization', `Bearer ${adminAccessToken}`)
					.send({ country: "ITA" })
					.expect(httpStatus.OK);

				localDb[authusers[i-1]["email"]].country = "ITA";
			  }
			}

			// delete 3th, 6th and 9th
			for (let i=1; i<=10; i++) {
			  if (i%3===0) {
				response = await request(app)
					.delete(`/users/${authusers[i-1]["id"]}`)
					.set('User-Agent', userAgent) 
					.set('Authorization', `Bearer ${adminAccessToken}`)
					.send()
					.expect(httpStatus.NO_CONTENT);

				delete localDb[authusers[i-1]["email"]];
			  }
			}

			// control the 3th, 6th and 9th users are in the deletedusers
			user = await userService.getDeletedUserById(authusers[8]["id"]);
			expect(user).toBeDefined();
			user = await userService.getDeletedUserById(authusers[5]["id"]);
			expect(user).toBeDefined();
			user = await userService.getDeletedUserById(authusers[2]["id"]);
			expect(user.deletedAt).toEqual(expect.any(Number));

			// get all authusers
			response = await request(app)
				.get('/users')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send()
				.expect(httpStatus.OK);

			// check the last added one is the first user, the default sort is descending createdAt
			expect(response.body.users.length).toBe(9);
			expect(response.body.users[0]["email"]).toBe("user10@gmail.com");

			// check localDb is equal to db result
			const arraysort = (a,b)=>a.createdAt-b.createdAt;
			expect(response.body.users.sort(arraysort)).toEqual(Object.values(localDb).sort(arraysort));

			// check the pagination
			expect(response.body.totalCount).toBe(9); // 3 of the users are deleted
			expect(response.body.pagination).toEqual({
				currentPage: 1,
				totalPages: 1,
				perPage: 20,
			});

			// get an user (10th)
			response = await request(app)
				.get(`/users/${authusers[9]["id"]}`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			// check the authuser data
			expect(response.status).toBe(httpStatus.OK);
			expect(response.headers['content-type']).toEqual(expect.stringContaining("json"));
			expect(response.body).toEqual({
				id: authusers[9]["id"],
				email: authusers[9]["email"],
				role: "user",
				name: "User-10",
				gender: "female",
				country: "ITA",
				createdAt: expect.any(Number)
			});

			// query filter country USA, check the count; and control the list
			response = await request(app)
				.get('/users')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ country: "USA", sort: "createdAt.asc" })
				.send()
				.expect(httpStatus.OK);
			
			expect(response.body.users.length).toBe(3);
			expect(response.body.users[0]["email"]).toBe("user1@gmail.com");
			expect(response.body.users[1]["email"]).toBe("user4@gmail.com");
			expect(response.body.users[2]["email"]).toBe("user7@gmail.com");

			// check the pagination
			expect(response.body.totalCount).toBe(3); // 5 were disabled but one deleted
			expect(response.body.pagination).toEqual({
				currentPage: 1,
				totalPages: 1,
				perPage: 20,
			});


			// query filter female; and check the count; and control the list
			response = await request(app)
				.get('/users')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ gender: "female", sort: "email", size: 2 })
				.send()
				.expect(httpStatus.OK);

			expect(response.body.users.length).toBe(2);
			expect(response.body.users[0]["email"]).toBe("user10@gmail.com");
			expect(response.body.users[1]["email"]).toBe("user2@gmail.com");

			// check the pagination
			expect(response.body.totalCount).toBe(4); // 5 were female but one deleted
			expect(response.body.pagination).toEqual({
				currentPage: 1,
				totalPages: 2,
				perPage: 2,
			});

			// get the second page
			response = await request(app)
				.get('/users')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ gender: "female", sort: "email", size: 2, page: 2 })
				.send()
				.expect(httpStatus.OK);

			expect(response.body.users.length).toBe(2);
			expect(response.body.users[0]["email"]).toBe("user4@gmail.com");
			expect(response.body.users[1]["email"]).toBe("user8@gmail.com");

			// check the pagination
			expect(response.body.totalCount).toBe(4); // 5 were female but one deleted
			expect(response.body.pagination).toEqual({
				currentPage: 2,
				totalPages: 2,
				perPage: 2,
			});

			// change the role of the test user
			await request(app)
				.patch(`/users/${testUser.id}`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({ role: "admin" })
				.expect(httpStatus.NO_CONTENT);

			response = await request(app)
				.get('/users')
				.set('User-Agent', userAgent)
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ role: "admin" })
				.send()
				.expect(httpStatus.OK);

			expect(response.body.users.length).toBe(2); // 2 admin users
			
	  	});
	});



	describe('The failure scenario for the users', () => {
		/*
		The Failure Test Scenario
		--------------------------
		- add an authuser and user correspondent
		- try to add another user with the same id, get the error
		- try to add an user which has not correspondent authuser, get the error
		- try to get an user with invalid id
		- try to get an user that not exists
		- try to get users with wrong parameters
		- try to update an user that not exists
		- try to delete an authuser that not exists
		- try to change user's role that not exists
		- try to change user's role validation errors
		*/

		test('failure scenario', async () => {
			let response;

			// add an authuser
			response = await request(app)
				.post('/authusers')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({
					email: "test@gmail.com",
					password: "Pass1word!",
					passwordConfirmation: "Pass1word!"
				})
				.expect(httpStatus.CREATED);

			const testAuthuser = response.body;

			const addForm = {
				email: testAuthuser.email,
				role: "user",
				name: "Mr.Test"
			};

			// add an user correspondent
			await request(app)
				.post(`/users/${testAuthuser.id}`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send(addForm);
			
			// try to add another user with the same id, get the error
			response = await request(app)
				.post(`/users/${testAuthuser.id}`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send(addForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ id: ["There is another user with the same id"]});

			// try to add an user which has not correspondent authuser, get the error
			response = await request(app)
				.post(`/users/123456789012345678901234`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send(addForm);

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ body: ["There is no correspondent authenticated user with the same id and email"]});

			// try to get an user with invalid id
			response = await request(app)
				.get('/users/1234567890')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ id: ["The param id must be a 24-character number"]});

			// try to get an user that not exists
			response = await request(app)
				.get('/users/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toBe("No user found");

			// try to get users with wrong parameters
			response = await request(app)
				.get('/users')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.query({ page: "a",  size: "b"})
				.send();

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ 
				page: ["The query param 'page' must be numeric value"],
				size: ["The query param 'size' must be numeric value"],
			});

			// try to update an user that not exists
			response = await request(app)
				.put('/users/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({ gender: "female" });

			TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toBe("No user found");

			// try to update an user with validation errors
			response = await request(app)
				.put('/users/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({ role: "admin", name: "", gender: "fmale", country: "tr" });

				TestUtil.validationErrorExpectations(response);
				expect(response.body.errors).toEqual({ 
					name: ["name must be minimum 2 characters"],
					gender: ["gender could be male, female or none"],
					country: ["country code must be 3-letter standart iso code"],
					body: ["Any extra parameter is not allowed other than name,gender,country"],
				});

			// try to delete an user that not exists
			response = await request(app)
				.delete('/users/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send();

			TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toBe("No user found");

			// try to change user's role that not exists
			response = await request(app)
				.patch('/users/123456789012345678901234')
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({ role: "admin" });

			TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
			expect(response.body.name).toBe("ApiError");
			expect(response.body.message).toBe("No user found");

			// try to change user's role validation errors
			response = await request(app)
				.patch(`/users/123456789012345678901234`)
				.set('User-Agent', userAgent) 
				.set('Authorization', `Bearer ${adminAccessToken}`)
				.send({ role: "client", additional: "" })

			TestUtil.validationErrorExpectations(response);
			expect(response.body.errors).toEqual({ 
				role: ["role could be one of user,admin"],
				body: ["Any extra parameter is not allowed other than 'role'"],
			});
		});

	});
});

[
	{
	  email: 'user10@gmail.com',
	  role: 'user',
	  name: 'User-10',
	  gender: 'female',
	  country: 'ITA',
	  createdAt: 1635436890060,
	  id: '617ac959935fce78fa8d63b3'
	},
	{
	  email: 'user8@gmail.com',
	  role: 'user',
	  name: 'User-8',
	  gender: 'female',
	  country: 'TUR',
	  createdAt: 1635436890004,
	  id: '617ac959935fce78fa8d63b1'
	},
	{
	  email: 'user7@gmail.com',
	  role: 'user',
	  name: 'User-7',
	  gender: 'male',
	  country: 'USA',
	  createdAt: 1635436889975,
	  id: '617ac959935fce78fa8d63b0'
	},
	{
	  email: 'user5@gmail.com',
	  role: 'user',
	  name: 'User-5',
	  gender: 'male',
	  country: 'ITA',
	  createdAt: 1635436889917,
	  id: '617ac959935fce78fa8d63ae'
	},
	{
	  email: 'user4@gmail.com',
	  role: 'user',
	  name: 'User-4',
	  gender: 'female',
	  country: 'USA',
	  createdAt: 1635436889889,
	  id: '617ac959935fce78fa8d63ad'
	},
	{
	  email: 'user2@gmail.com',
	  role: 'user',
	  name: 'User-2',
	  gender: 'female',
	  country: 'TUR',
	  createdAt: 1635436889835,
	  id: '617ac959935fce78fa8d63ab'
	},
	{
	  email: 'user1@gmail.com',
	  role: 'user',
	  name: 'User-1',
	  gender: 'male',
	  country: 'USA',
	  createdAt: 1635436889806,
	  id: '617ac959935fce78fa8d63aa'
	},
	{
	  email: 'test@gmail.com',
	  role: 'user',
	  name: 'Mr.Test',
	  gender: null,
	  country: null,
	  createdAt: 1635436889310,
	  id: '617ac959935fce78fa8d63a9'
	},
	{
	  email: 'admin@gmail.com',
	  role: 'admin',
	  name: 'Mr.Admin',
	  gender: null,
	  country: null,
	  createdAt: 1635436889182,
	  id: '617ac959935fce78fa8d63a7'
	}
  ]