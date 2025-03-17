const request = require("supertest");
const { status: httpStatus } = require("http-status");
const bcrypt = require("bcryptjs");

const app = require("../../src/core/express");

const { authuserService, userService, authuserDbService } = require("../../src/services");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

const AuthUser = require("../../src/models/authuser.model");
const TestUtil = require("../testutils/TestUtil");

setupTestDatabase();
setupRedis();

/**
 * @typedef {Object} AuthProviders
 * @property {boolean} [emailpassword]
 * @property {string} [google]
 * @property {string} [facebook]
 *
 * @typedef {Object} AuthuserInResponse
 * @property {string} id
 * @property {string} email
 * @property {boolean} isEmailVerified
 * @property {boolean} isDisabled
 * @property {AuthProviders} [providers]
 * @property {number} createdAt
 * @property {number|null} [updatedAt]
 */

describe("PATH /authusers", () => {
  const userAgent = "from-jest-test";

  /** @type {Record<string, AuthuserInResponse>} */
  const localDb = {}; // reflects the database authusers collection

  /** @type {string} */
  let adminAccessToken;

  /** @type {string} */
  let adminAuthuserId;

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

    expect(response.body.error).toBeUndefined();

    adminAccessToken = response.body.data.tokens.access.token;
    adminAuthuserId = response.body.data.authuser.id; // used in below test

    /** @type {AuthuserInResponse} */
    const adminAuthuser = response.body.data.authuser;

    // add admin authusers to localDb
    localDb[adminAuthuser.email] = adminAuthuser;

    // create an admin user correspondent with the authuser
    await userService.addUser(adminAuthuser.id, {
      email: adminAuthuser.email,
      role: "admin",
      name: "Mr.Admin",
    });
  });

  describe("The success scenario for the authusers", () => {
    /*
		The Success Test Scenario
		-------------------------
		- add an authuser
		- check its properties and the password is hashed
		- add 10 authusers
		- check random 8th authuser exists in db
		- get all authusers and check the count
		- update even ones as disabled, toggleAbility
		- update 5th and 10th as email verified, toggleVerification
    - unlink provider
		- delete 3th, 6th and 9th
		- control the 3th, 6th and 9th authusers are in the deletedauthusers
		- get an authuser, check the data
		- query filter disabled, check the count; and control the list
		- query filter not disabled and email not verified; and check the count; and control the list
		- check the paginations, get iterations and check the counts and pagination infos
		- change own password, check the password is hashed
		*/

    test("success scenario", async () => {
      let response;

      /** @type {boolean} */
      let check;

      /** @type {AuthUser|null} */
      let authuserInstance = null;

      /** @type {AuthuserInResponse[]} */
      const authusers = []; // holds the static data of the 10 authusers to be created

      const addForm = {
        email: "test@gmail.com",
        password: "Pass1word!",
        passwordConfirmation: "Pass1word!",
      };

      // add an authuser
      response = await request(app)
        .post("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm);

      expect(response.body.error).toBeUndefined();

      /** @type {AuthuserInResponse} */
      const testAuthuser = response.body.data.authuser;

      // check the testAuthuser created above
      expect(response.status).toBe(httpStatus.CREATED);
      expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));
      expect(response.headers["location"]).toEqual(expect.stringContaining("/authusers/"));
      expect(response.body.success).toBe(true);
      expect(response.body.data).not.toHaveProperty("tokens");
      expect(testAuthuser).not.toHaveProperty("password");
      expect(testAuthuser).toEqual({
        id: expect.any(String),
        email: addForm.email,
        isEmailVerified: false,
        isDisabled: false,
        createdAt: expect.any(Number),
        updatedAt: null,
        providers: { emailpassword: true },
      });

      // check the test authuser's password is hashed
      authuserInstance = await authuserDbService.getAuthUser({ id: testAuthuser.id });

      if (!authuserInstance) {
        throw new Error("Unexpected fail in db operation while gettitng test authuser");
      }

      expect(authuserInstance.password).not.toBeNull();

      if (authuserInstance.password) {
        check = await bcrypt.compare(addForm.password, authuserInstance.password);
        expect(check).toBeTruthy();
      }

      // add test authuser to localDb
      localDb[testAuthuser.email] = testAuthuser;

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

        expect(response.body.error).toBeUndefined();

        /** @type {AuthuserInResponse} */
        const authuser = response.body.data.authuser;
        authusers.push(authuser);
        localDb[authuser.email] = authuser;
      }

      // check random 8th authuser exists in db
      check = await authuserService.isExist(localDb["user8@gmail.com"].id, "user8@gmail.com");
      expect(check).toBeTruthy();

      // get all authusers and check the count
      response = await request(app)
        .get("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      expect(response.body.error).toBeUndefined();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));
      expect(response.body.success).toBe(true);
      expect(response.body.data.authusers.length).toBe(12); // including admin and test authusers
      expect(authusers.length).toBe(10);

      // update even ones as disabled, toggleAbility
      for (let i = 1; i <= 10; i++) {
        if (i % 2 === 0) {
          response = await request(app)
            .patch(`/authusers/${authusers[i - 1]["id"]}/toggle-ability`)
            .set("User-Agent", userAgent)
            .set("Authorization", `Bearer ${adminAccessToken}`)
            .send()
            .expect(httpStatus.OK);

          expect(response.body.error).toBeUndefined();

          localDb[authusers[i - 1]["email"]].isDisabled = true;

          const updatedAuthuserInstance = await authuserDbService.getAuthUser({
            id: authusers[i - 1]["id"],
          });

          if (!updatedAuthuserInstance) {
            throw new Error("Unexpected fail in db operation while gettitng updated authuser");
          }

          localDb[authusers[i - 1]["email"]].updatedAt = updatedAuthuserInstance.updatedAt;
        }
      }

      // update 5th and 10th as email verified, toggleVerification
      for (let i = 1; i <= 10; i++) {
        if (i % 5 === 0) {
          response = await request(app)
            .patch(`/authusers/${authusers[i - 1]["id"]}/toggle-verification`)
            .set("User-Agent", userAgent)
            .set("Authorization", `Bearer ${adminAccessToken}`)
            .send()
            .expect(httpStatus.OK);

          expect(response.body.error).toBeUndefined();

          localDb[authusers[i - 1]["email"]].isEmailVerified = true;

          const updatedAuthuserInstance = await authuserDbService.getAuthUser({
            id: authusers[i - 1]["id"],
          });

          if (!updatedAuthuserInstance) {
            throw new Error("Unexpected fail in db operation while gettitng updated authuser");
          }

          localDb[authusers[i - 1]["email"]].updatedAt = updatedAuthuserInstance.updatedAt;
        }
      }

      // test the unlink provider of 4th authuser
      await authuserDbService.updateAuthUser(authusers[3]["id"], {
        providers: {
          emailpassword: true,
          google: "google-id-string",
          facebook: "facebook-id-string",
        },
      });

      response = await request(app)
        .patch(`/authusers/${authusers[3]["id"]}/unlink-provider?provider=google`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(response.body.error).toBeUndefined();

      expect(response.body.data.authuser.providers).not.toHaveProperty("google");
      expect(response.body.data.authuser.providers).toHaveProperty("facebook");
      expect(response.body.data.authuser.providers).toHaveProperty("emailpassword");

      response = await request(app)
        .patch(`/authusers/${authusers[3]["id"]}/unlink-provider?provider=emailpassword`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(response.body.error).toBeUndefined();

      expect(response.body.data.authuser.providers).not.toHaveProperty("google");
      expect(response.body.data.authuser.providers).not.toHaveProperty("emailpassword");
      expect(response.body.data.authuser.providers).toHaveProperty("facebook");

      localDb[authusers[3]["email"]].updatedAt = response.body.data.authuser.updatedAt;
      localDb[authusers[3]["email"]].providers = response.body.data.authuser.providers;

      // check the 4th authuser's password is null; because the emailpassword is unlinked
      authuserInstance = await authuserDbService.getAuthUser({
        id: response.body.data.authuser.id,
      });

      expect(authuserInstance?.password).toBeNull();

      // delete 3th, 6th and 9th
      for (let i = 1; i <= 10; i++) {
        if (i % 3 === 0) {
          response = await request(app)
            .delete(`/authusers/${authusers[i - 1]["id"]}`)
            .set("User-Agent", userAgent)
            .set("Authorization", `Bearer ${adminAccessToken}`)
            .send()
            .expect(httpStatus.OK);

          expect(response.body.error).toBeUndefined();

          delete localDb[authusers[i - 1]["email"]];
        }
      }

      // control the 3th, 6th and 9th authusers are in the deletedauthusers
      authuserInstance = await authuserService.getDeletedAuthUserById(authusers[8]["id"]);
      expect(authuserInstance).toBeDefined();
      authuserInstance = await authuserService.getDeletedAuthUserById(authusers[5]["id"]);
      expect(authuserInstance).toBeDefined();
      authuserInstance = await authuserService.getDeletedAuthUserById(authusers[2]["id"]);
      expect(authuserInstance.deletedAt).toEqual(expect.any(Number));

      // get all authusers
      response = await request(app)
        .get("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(response.body.error).toBeUndefined();

      // check the last added one is the first authuser, the default sort is descending createdAt
      expect(response.body.success).toBe(true);
      expect(response.body.data.authusers.length).toBe(9);
      expect(response.body.data.authusers[0]["email"]).toBe("user10@gmail.com");

      /**
       * check localDb is equal to db result
       * @param {AuthuserInResponse} a
       * @param {AuthuserInResponse} b
       * @returns
       */
      const arraysort = (a, b) => a.createdAt - b.createdAt;

      expect(response.body.data.authusers.sort(arraysort)).toEqual(
        Object.values(localDb).sort(arraysort),
      );

      // check the pagination
      expect(response.body.data.totalCount).toBe(9); // 3 of the authusers are deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 0,
        pageNumber: 1,
        pageCount: 1,
        pageSize: 20,
      });

      // get an authuser (10th)
      response = await request(app)
        .get(`/authusers/${authusers[9]["id"]}`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      expect(response.body.error).toBeUndefined();

      // check the authuser data
      expect(response.status).toBe(httpStatus.OK);
      expect(response.headers["content-type"]).toEqual(expect.stringContaining("json"));
      expect(response.body.success).toBe(true);
      expect(response.body.data.authuser).not.toHaveProperty("password");
      expect(response.body.data.authuser).toEqual({
        id: authusers[9]["id"],
        email: authusers[9]["email"],
        isEmailVerified: true,
        isDisabled: true,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        providers: { emailpassword: true },
      });

      // query filter disabled, check the count; and control the list
      response = await request(app)
        .get("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ isDisabled: true, sort: "createdAt.asc" })
        .send();

      expect(response.body.error).toBeUndefined();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authusers.length).toBe(4);
      expect(response.body.data.authusers[0]["email"]).toBe("user2@gmail.com");
      expect(response.body.data.authusers[1]["email"]).toBe("user4@gmail.com");
      expect(response.body.data.authusers[2]["email"]).toBe("user8@gmail.com");
      expect(response.body.data.authusers[3]["email"]).toBe("user10@gmail.com");

      // check the pagination
      expect(response.body.data.totalCount).toBe(4); // 5 were disabled but one deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 0,
        pageNumber: 1,
        pageCount: 1,
        pageSize: 20,
      });

      // query filter not disabled and email not verified; and check the count; and control the list
      response = await request(app)
        .get("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ isDisabled: false, isEmailVerified: false, sort: "email", size: 2 })
        .send();

      expect(response.body.error).toBeUndefined();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authusers.length).toBe(2);
      expect(response.body.data.authusers[0]["email"]).toBe("admin@gmail.com");
      expect(response.body.data.authusers[1]["email"]).toBe("test@gmail.com");

      // check the pagination
      expect(response.body.data.totalCount).toBe(4); // 5 were disabled but one deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 0,
        pageNumber: 1,
        pageCount: 2,
        pageSize: 2,
      });

      // get the second page
      response = await request(app)
        .get("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ isDisabled: false, isEmailVerified: false, sort: "email", size: 2, page: 2 })
        .send();

      expect(response.body.error).toBeUndefined();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authusers.length).toBe(2);
      expect(response.body.data.authusers[0]["email"]).toBe("user1@gmail.com");
      expect(response.body.data.authusers[1]["email"]).toBe("user7@gmail.com");

      // check the pagination
      expect(response.body.data.totalCount).toBe(4); // 5 were disabled but one deleted
      expect(response.body.data.pagination).toEqual({
        pageIndex: 1,
        pageNumber: 2,
        pageCount: 2,
        pageSize: 2,
      });

      // change own password
      const newPassword = "Pass1word+";
      response = await request(app)
        .patch("/authusers/password")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          currentPassword: "Pass1word!",
          password: newPassword,
          passwordConfirmation: newPassword,
        });

      expect(response.body.error).toBeUndefined();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);

      // check the admin authuser's new password is hashed
      authuserInstance = await authuserDbService.getAuthUser({ id: adminAuthuserId });

      if (!authuserInstance) {
        throw new Error("Unexpected fail in db operation while gettitng test authuser");
      }

      expect(authuserInstance.password).not.toBeNull();

      if (authuserInstance.password) {
        check = await bcrypt.compare(newPassword, authuserInstance.password);
        expect(check).toBeTruthy();
      }
    });
  });

  describe("The failure scenario for the authusers", () => {
    /*
		The Failure Test Scenario
		--------------------------
		- add an authuser
		- try to add another authuser with the same email, get the error
		- try to get an authuser with invalid id
		- try to get an authuser that not exists
		- try to get authusers with wrong parameters
		- try to disable an authuser that not exists
    - try to change email verification status of an authuser that not exists
    - try to unlink provider, authuser does not exist
    - try to unlink provider which is already unlinked
    - try to unlink provider which is the only auth provider in providers
    - try to unlink provider without query param provider
		- try to delete an authuser that not exists
		- try to change another authuser's password
		- try to change password with validation errors
		*/

    test("failure scenario", async () => {
      let response;

      const addForm = {
        email: "test@gmail.com",
        password: "Pass1word!",
        passwordConfirmation: "Pass1word!",
      };

      // add an authuser
      response = await request(app)
        .post("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm)
        .expect(httpStatus.CREATED);

      const authuser = response.body.data.authuser;

      // try to add another authuser with the same email, get the error
      response = await request(app)
        .post("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(addForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({ email: ["email is already taken"] });

      // try to get an authuser with invalid id
      response = await request(app)
        .get("/authusers/1234567890")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });

      // try to get an authuser that not exists
      response = await request(app)
        .get("/authusers/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to get authusers with wrong parameters
      response = await request(app)
        .get("/authusers")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ page: "a", size: "b" })
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        page: ["The query param 'page' must be numeric value"],
        size: ["The query param 'size' must be numeric value"],
      });

      // try to disable an authuser that not exists
      response = await request(app)
        .patch("/authusers/123456789012345678901234/toggle-ability")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to change email verification status of an authuser that not exists
      response = await request(app)
        .patch("/authusers/123456789012345678901234/toggle-verification")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to unlink provider, authuser does not exist
      response = await request(app)
        .patch(`/authusers/123456789012345678901234/unlink-provider?provider=google`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to unlink provider which is already unlinked
      response = await request(app)
        .patch(`/authusers/${authuser.id}/unlink-provider?provider=google`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.BAD_REQUEST);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("The auth provider is already unlinked");

      // try to unlink provider which is the only auth provider in services
      response = await request(app)
        .patch(`/authusers/${authuser.id}/unlink-provider?provider=emailpassword`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.BAD_REQUEST);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("There must be one auth provider at least");

      // try to unlink provider without query param provider
      response = await request(app)
        .patch(`/authusers/${authuser.id}/unlink-provider`)
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        provider: ["query param 'provider' is missing"],
      });

      // try to delete an authuser that not exists
      response = await request(app)
        .delete("/authusers/123456789012345678901234")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send();

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toBe("No user found");

      // try to change another authuser's password
      // there is no route for that action, so only own password

      // try to change password with validation errors
      response = await request(app)
        .patch("/authusers/password")
        .set("User-Agent", userAgent)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({
          currentPassword: "Pass1word",
          password: "invalid",
          passwordConfirmation: "nomatch",
        });

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors).toEqual({
        currentPassword: ["incorrect current password"],
        password: ["must be minimum 8 characters"],
        passwordConfirmation: ["should match with the password"],
      });
    });
  });
});
