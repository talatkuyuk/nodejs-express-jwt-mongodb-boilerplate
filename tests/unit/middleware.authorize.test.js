const { status: httpStatus } = require("http-status");
const httpMocks = require("node-mocks-http");

const { authorize } = require("../../src/middlewares");
const ApiError = require("../../src/utils/ApiError");

const userDbService = require("../../src/services/user.db.service");
const User = require("../../src/models/user.model");

describe("Authorization Middleware: Check the user right(s)", () => {
  // I've not create myuser and otheruser objects here, since the spyOn functions and mock implementations could not be cleared for each test.
  // that is why I've created these variables in each test

  test("should throw ApiError with code 403 if the user has the right but for only himself", async () => {
    // lets assume that the auth middleware does not use the joined query, and the role is not attached to the authuser
    const myuser = { id: "111111111111111111111111" };

    const otheruser = { id: "999999999999999999999999" };

    // The authorize middleware process the req.params and the req.authuser (attached in auth middleware) in its logic,
    // so it is enough to have the request object like below

    /** @type {httpMocks.RequestOptions} */
    const request = { params: { id: otheruser.id } };

    request.authuser = myuser; // it is attached in authentication middleware

    const req = httpMocks.createRequest(request);
    const res = httpMocks.createResponse();
    const next = jest.fn();

    // lets assume that the user has "user" role
    jest.spyOn(userDbService, "getUser").mockResolvedValue(new User("user@xxx.com", "user"));

    await authorize("get-user")(req, res, next);

    const expectedError = new ApiError(
      httpStatus.FORBIDDEN,
      "You are authorized only your own data",
    );

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.toBeMatchedWithError(expectedError));
    expect(req.user?.role).toEqual("user");
  });

  test("should throw ApiError with code 403 even if the admin tries to change password belongs to another user", async () => {
    // lets assume that the auth middleware does not use the joined query, and the role is not attached to the authuser
    const myuser = { id: "111111111111111111111111" };

    const otheruser = { id: "999999999999999999999999" };

    /** @type {httpMocks.RequestOptions} */
    const request = { params: { id: otheruser.id } };

    request.authuser = myuser; // it is attached in authentication middleware

    const req = httpMocks.createRequest(request);
    const res = httpMocks.createResponse();
    const next = jest.fn();

    // lets assume that the user is admin
    jest.spyOn(userDbService, "getUser").mockResolvedValue(new User("user@xxx.com", "admin"));

    await authorize("change-password")(req, res, next);

    const expectedError = new ApiError(
      httpStatus.FORBIDDEN,
      "You are authorized only your own data",
    );

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.toBeMatchedWithError(expectedError));
    expect(req.user?.role).toEqual("admin");
  });

  test("should throw ApiError with code 403 if the user does not have appropriate right", async () => {
    /** @type {httpMocks.RequestOptions} */
    const request = {};

    request.authuser = { id: "111111111111111111111111" }; // it is attached in authentication middleware

    const req = httpMocks.createRequest(request);
    const res = httpMocks.createResponse();
    const next = jest.fn();

    // lets assume that there is no user in users yet just after registration
    jest.spyOn(userDbService, "getUser").mockResolvedValue(null);

    await authorize("query-users")(req, res, next);

    const expectedError = new ApiError(
      httpStatus.FORBIDDEN,
      "You do not have appropriate right",
    );

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.toBeMatchedWithError(expectedError));
    expect(req?.user?.role).toBeUndefined();
  });

  test("should continue next middleware if the user has appropriate right related himself", async () => {
    // lets assume that the auth middleware does not use the joined query, and the role is not attached to the authuser
    const myuser = { id: "111111111111111111111111" };

    /** @type {httpMocks.RequestOptions} */
    const request = { params: { id: myuser.id } };

    request.authuser = myuser; // it is attached in authentication middleware

    const req = httpMocks.createRequest(request);
    const res = httpMocks.createResponse();
    const next = jest.fn();

    // lets assume that there is no user in users yet just after registration
    jest.spyOn(userDbService, "getUser").mockResolvedValue(null);

    await authorize("change-password")(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req?.user?.role).toBeUndefined();
  });

  test("should continue next middleware if the user has admin right", async () => {
    const id = "111111111111111111111111";

    /** @type {httpMocks.RequestOptions} */
    const request = {};

    request.authuser = { id }; // it is attached in authentication middleware

    const req = httpMocks.createRequest(request);
    const res = httpMocks.createResponse();
    const next = jest.fn();

    // lets assume that the user is admin

    const user = new User("user@xxx.com", "admin");
    user.id = id;
    jest.spyOn(userDbService, "getUser").mockResolvedValue(user);

    await authorize("query-users")(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.id).toEqual(id);
    expect(req.user?.role).toEqual("admin");
  });

  test("should continue next middleware if there is no required rights for the specific express route", async () => {
    /** @type {httpMocks.RequestOptions} */
    const request = {};

    request.authuser = { id: "111111111111111111111111" };

    const req = httpMocks.createRequest(request);
    const res = httpMocks.createResponse();
    const next = jest.fn();

    jest.spyOn(userDbService, "getUser").mockResolvedValue(new User("user@xxx.com", "user"));

    await authorize()(req, res, next); // no parameter means that there is no required rights and will grant to do regardles of the user role.

    expect(next).toHaveBeenCalledWith();
    //expect(req.user.id).toEqual(authuser.id);
    expect(req.user?.role).toEqual("user");
  });
});
