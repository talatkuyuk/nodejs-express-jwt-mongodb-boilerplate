const request = require("supertest");
const httpStatus = require("http-status");

const app = require("../../src/core/express");

const { userService, userDbService } = require("../../src/services");

const TestUtil = require("../testutils/TestUtil");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("PATH /users", () => {
  const userAgent = "from-jest-test";
  const localDb = {}; // reflects the database users collection
  let adminAccessToken;

  beforeEach(async () => {
    // create an authuser
    const response = await request(app)
      .post("/auth/signup")
      .set("User-Agent", userAgent)
      .send({
        email: "admin@gmail.com",
        password: "Pass1word!",
        passwordConfirmation: "Pass1word!",
      });

    adminAccessToken = response.body.data.tokens.access.token;
    const adminAuthuser = response.body.data.authuser;

    // create an admin user correspondent with the authuser
    const adminUser = await userService.addUser(adminAuthuser.id, {
      email: adminAuthuser.email,
      role: "admin",
      name: "Mr.Admin",
    });

    // add admin authusers to localDb
    localDb[adminUser.email] = { ...adminUser };
  });

  describe("The success scenario for the users", () => {
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

    test("success scenario", async () => {
      let response, data, user;
      const authusers = []; // holds the static data of the 10 authusers to be created

      // add an authuser
      response = await request(app)
        .post("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          email: "test@gmail.com",
          password: "Pass1word!",
          passwordConfirmation: "Pass1word!",
        })
        .expect(httpStatus.CREATED);

      const testAuthuser = response.body.data.authuser;

      const addForm = {
        email: testAuthuser.email,
        role: "user",
        name: "Mr.Test",
      };

      // add an user correspondent
      response = await request(app)
        .post(`/users/${testAuthuser.id}`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm);

      const testUser = response.body.data.user;

      // add test authuser to localDb
      localDb[testUser.email] = testUser;

      // check the testUser created above
      expect(response.status).toBe(httpStatus.CREATED);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );
      expect(response.headers["location"]).toEqual(
        expect.stringContaining("/users/")
      );
      expect(response.body.success).toBe(true);
      expect(testUser).toEqual({
        id: testAuthuser.id,
        email: testAuthuser.email,
        role: "user",
        name: "Mr.Test",
        gender: null,
        country: null,
        createdAt: expect.any(Number),
        updatedAt: null,
      });

      // add ten authusers
      for (let i = 1; i <= 10; i++) {
        response = await request(app)
          .post("/authusers")
          .set("User-Agent", userAgent)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            email: `user${i}@gmail.com`,
            password: "Pass1word!",
            passwordConfirmation: "Pass1word!",
          });

        authusers.push(response.body.data.authuser);
      }

      // add ten users correspondent
      for (let i = 1; i <= 10; i++) {
        response = await request(app)
          .post(`/users/${authusers[i - 1]["id"]}`)
          .set("User-Agent", userAgent)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            email: authusers[i - 1]["email"],
            role: "user",
            name: `User-${i}`,
            gender: i % 2 === 0 ? "female" : "male",
            country: i % 3 == 1 ? "USA" : "TUR",
          });

        const user = response.body.data.user;
        localDb[user.email] = user;
      }

      // check random 8th user exists in db
      data = await userService.isExist(
        localDb["user8@gmail.com"].id,
        "user8@gmail.com"
      );
      expect(data).toBeTruthy();

      // get all users and check the count
      response = await request(app)
        .get("/users")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );
      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBe(12); // including admin and test users

      // update some as country ITA
      for (let i = 1; i <= 10; i++) {
        if (i % 5 === 0) {
          await request(app)
            .put(`/users/${authusers[i - 1]["id"]}`)
            .set("User-Agent", userAgent)
            .set("Authorization", `Bearer ${adminAccessToken}`)
            .send({ country: "ITA" })
            .expect(httpStatus.OK);

          localDb[authusers[i - 1]["email"]].country = "ITA";

          const updatedUser = await userDbService.getUser({
            id: authusers[i - 1]["id"],
          });
          localDb[authusers[i - 1]["email"]].updatedAt = updatedUser.updatedAt;
        }
      }

      // delete 3th, 6th and 9th
      for (let i = 1; i <= 10; i++) {
        if (i % 3 === 0) {
          await request(app)
            .delete(`/users/${authusers[i - 1]["id"]}`)
            .set("User-Agent", userAgent)
            .set("Authorization", `Bearer ${adminAccessToken}`)
            .send()
            .expect(httpStatus.OK);

          delete localDb[authusers[i - 1]["email"]];
        }
      }

      // control the 3th, 6th and 9th users are in the deletedusers
      user = await userService.getDeletedUserById(authusers[8]["id"]);
      expect(user).toBeDefined();
      user = await userService.getDeletedUserById(authusers[5]["id"]);
      expect(user).toBeDefined();
      user = await userService.getDeletedUserById(authusers[2]["id"]);
      expect(user.deletedAt).toEqual(expect.any(Number));

      // get all users
      response = await request(app)
        .get("/users")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      // check the last added one is the first user, the default sort is descending createdAt
      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBe(9);
      expect(response.body.data.users[0]["email"]).toBe("user10@gmail.com");

      // check localDb is equal to db result
      const arraysort = (a, b) => a.createdAt - b.createdAt;
      expect(response.body.data.users.sort(arraysort)).toEqual(
        Object.values(localDb).sort(arraysort)
      );

      // check the pagination
      expect(response.body.data.totalCount).toBe(9); // 3 of the users are deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 0,
        pageNumber: 1,
        pageCount: 1,
        pageSize: 20,
      });

      // get an user (10th)
      response = await request(app)
        .get(`/users/${authusers[9]["id"]}`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      // check the user data
      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json")
      );
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual({
        id: authusers[9]["id"],
        email: authusers[9]["email"],
        role: "user",
        name: "User-10",
        gender: "female",
        country: "ITA",
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });

      // query filter country USA, check the count; and control the list
      response = await request(app)
        .get("/users")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ country: "USA", sort: "createdAt.asc" })
        .send()
        .expect(httpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBe(3);
      expect(response.body.data.users[0]["email"]).toBe("user1@gmail.com");
      expect(response.body.data.users[1]["email"]).toBe("user4@gmail.com");
      expect(response.body.data.users[2]["email"]).toBe("user7@gmail.com");

      // check the pagination
      expect(response.body.data.totalCount).toBe(3); // 5 were disabled but one deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 0,
        pageNumber: 1,
        pageCount: 1,
        pageSize: 20,
      });

      // query filter female; and check the count; and control the list
      response = await request(app)
        .get("/users")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ gender: "female", sort: "email", size: 2 })
        .send()
        .expect(httpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBe(2);
      expect(response.body.data.users[0]["email"]).toBe("user10@gmail.com");
      expect(response.body.data.users[1]["email"]).toBe("user2@gmail.com");

      // check the pagination
      expect(response.body.data.totalCount).toBe(4); // 5 were female but one deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 0,
        pageNumber: 1,
        pageCount: 2,
        pageSize: 2,
      });

      // get the second page
      response = await request(app)
        .get("/users")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ gender: "female", sort: "email", size: 2, page: 2 })
        .send()
        .expect(httpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBe(2);
      expect(response.body.data.users[0]["email"]).toBe("user4@gmail.com");
      expect(response.body.data.users[1]["email"]).toBe("user8@gmail.com");

      // check the pagination
      expect(response.body.data.totalCount).toBe(4); // 5 were female but one deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 1,
        pageNumber: 2,
        pageCount: 2,
        pageSize: 2,
      });

      // change the role of the test user
      await request(app)
        .patch(`/users/${testUser.id}`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({ role: "admin" })
        .expect(httpStatus.OK);

      response = await request(app)
        .get("/users")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ role: "admin" })
        .send()
        .expect(httpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBe(2); // 2 admin users
    });
  });

  describe("The failure scenario for the users", () => {
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

    test("failure scenario", async () => {
      let response;

      // add an authuser
      response = await request(app)
        .post("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          email: "test@gmail.com",
          password: "Pass1word!",
          passwordConfirmation: "Pass1word!",
        })
        .expect(httpStatus.CREATED);

      const testAuthuser = response.body.data.authuser;

      const addForm1 = {
        email: "",
        role: "",
        name: "",
        gender: "",
        country: "",
      };

      // try to add an user correspondent with the authuser but having the validation errors
      response = await request(app)
        .post(`/users/${testAuthuser.id}`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm1);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        email: ["must not be empty"],
        role: ["must be user"],
        name: ["requires minimum 2 characters"],
        gender: ["must not be empty"],
        country: ["must not be empty"],
      });

      const addForm2 = {
        email: testAuthuser.email,
        role: "user",
        name: "Mr.Test",
      };

      // add a valid user correspondent
      await request(app)
        .post(`/users/${testAuthuser.id}`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm2);

      // try to add another user with the same id, get the error
      response = await request(app)
        .post(`/users/${testAuthuser.id}`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm2);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        id: ["There is another user with the same id"],
      });

      // try to add an user which has not correspondent authuser, get the error
      response = await request(app)
        .post(`/users/123456789012345678901234`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm2);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        body: [
          "There is no correspondent authenticated user with the same id and email",
        ],
      });

      // try to get an user with invalid id
      response = await request(app)
        .get("/users/1234567890")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });

      // try to get an user that not exists
      response = await request(app)
        .get("/users/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to get users with wrong parameters
      response = await request(app)
        .get("/users")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ page: "a", size: "b" })
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        page: ["The query param 'page' must be numeric value"],
        size: ["The query param 'size' must be numeric value"],
      });

      // try to update an user that not exists
      response = await request(app)
        .put("/users/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({ gender: "female" });

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to update an user with validation errors (empty values)
      response = await request(app)
        .put("/users/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({ role: "admin", name: "", gender: "", country: "" });

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        name: ["requires minimum 2 characters"],
        gender: ["must not be empty"],
        country: ["must not be empty"],
        body: ["Any extra parameter is not allowed"],
      });

      // try to update an user with validation errors
      response = await request(app)
        .put("/users/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({ role: "", name: "a", gender: "fmale", country: "tr" });

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        name: ["requires minimum 2 characters"],
        gender: ["should be male, female or none"],
        country: ["must be 3-letter standart country code"],
        body: ["Any extra parameter is not allowed"],
      });

      // try to delete an user that not exists
      response = await request(app)
        .delete("/users/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to change user's role that not exists
      response = await request(app)
        .patch("/users/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({ role: "admin" });

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to change user's role validation errors
      response = await request(app)
        .patch(`/users/123456789012345678901234`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({ role: "client", additional: "" });

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        role: ["role could be one of user,admin"],
        body: ["Any extra parameter is not allowed"],
      });
    });
  });
});
