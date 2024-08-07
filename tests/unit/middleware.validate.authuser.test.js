const httpMocks = require("node-mocks-http");

const { validate } = require("../../src/middlewares");
const authuserValidation = require("../../src/validations/authuser.ValidationRules");
const ApiError = require("../../src/utils/ApiError");
const { authuserService } = require("../../src/services");
const { AuthUser } = require("../../src/models");
const { authProvider } = require("../../src/config/providers");

const TestUtil = require("../testutils/TestUtil");

describe("Validate Middleware : Athuser validation rules", () => {
  describe("getAuthUsers validation", () => {
    test("getAuthUsers: should throw error 422, if a query param has multiple value", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: {
          email: ["email@xxx.com", "email@yyy.com"], // multiple value
          page: ["2", "5"], // multiple value
          sort: "email",
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        email: ["The parameter can only appear once in the query string"],
        page: ["The parameter can only appear once in the query string"],
      });
    });

    test("getAuthUsers: should throw error 422, if the query param isDisabled is not boolean value", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: { isDisabled: "5" }, // is not boolean
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        isDisabled: ["The query param 'isDisabled' must be boolean value"],
      });
    });

    test("getAuthUsers: should throw error 422, if the query param isEmailVerified is not boolean value", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: { isEmailVerified: "truex" }, // is not boolean
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        isEmailVerified: ["The query param 'isEmailVerified' must be boolean value"],
      });
    });

    test("getAuthUsers: should throw error 422, if the query param page is not numeric value", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: { page: "" }, // is not numeric
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        page: ["The query param 'page' must be numeric value"],
      });
    });

    test("getAuthUsers: should throw error 422, if the query param size is not numeric value", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: { size: "a" }, // is not numeric
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        size: ["The query param 'size' must be numeric value"],
      });
    });

    test("getAuthUsers: should throw error 422, if the query param size is not between 1-50", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: { size: "0" }, // is not between 1-50
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        size: ["The query param 'size' can be between 1-50"],
      });
    });

    test("getAuthUsers: should throw error 422, if the query param sort contains an invalid character", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: { sort: "email, createdAt" }, // includes comma (only . period and | pipedelimeter allowed)
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        sort: ["The query param 'sort' can contains a-zA-Z letters . dot and | pipedelimeter"],
      });
    });

    test("getAuthUsers: should continue next middleware if the query params are valid", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        query: {
          email: "email@xxx.com",
          isDisabled: "tRue",
          isEmailVerified: "falsE",
          page: "2",
          size: "12",
          sort: "email.desc | createdAt ",
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    test("getAuthUsers: should continue next middleware even if the request query is absent", async () => {
      const req = httpMocks.createRequest(); // means that "get all authusers"
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUsers)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("addAuthUser validation", () => {
    test("addAuthUser: should throw error 422, if the body is empty", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {},
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnEmail = jest.spyOn(authuserService, "isEmailTaken");
      spyOnEmail.mockResolvedValue(false);

      await validate(authuserValidation.addAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        email: ["must not be empty"],
        password: ["must not be empty"],
        passwordConfirmation: ["must not be empty"],
      });
    });

    test("addAuthUser: should throw error 422, if the email and password is empty", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          email: "",
          password: "",
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnEmail = jest.spyOn(authuserService, "isEmailTaken");
      spyOnEmail.mockResolvedValue(false);

      await validate(authuserValidation.addAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        email: ["must not be empty"],
        password: ["must not be empty"],
        passwordConfirmation: ["must not be empty"],
      });
    });

    test("addAuthUser: should throw error 422, if the email and password are not in valid form", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          email: "user@gmail", // invalid email form
          password: "1234", // less than 8 charachters
          passwordConfirmation: "", // empty
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnEmail = jest.spyOn(authuserService, "isEmailTaken");
      spyOnEmail.mockResolvedValue(false);

      await validate(authuserValidation.addAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        email: ["must be valid email address"],
        password: ["must be minimum 8 characters"],
        passwordConfirmation: ["must not be empty"],
      });
    });

    test("addAuthUser: should throw error 422, if the password is not valid and confirmation does not match", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          email: "user@gmail.com",
          password: "Password", // no number and special char
          passwordConfirmation: "Password+", // does not match with the password
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnEmail = jest.spyOn(authuserService, "isEmailTaken");
      spyOnEmail.mockResolvedValue(false);

      await validate(authuserValidation.addAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        password: ["must contain uppercase, lowercase, number and special char"],
        passwordConfirmation: ["should match with the password"],
      });
    });

    test("addAuthUser: should throw error 422, if the email is already taken", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          email: "user@gmail.com",
          password: "Pass1word!",
          passwordConfirmation: "Pass1word!",
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnEmail = jest.spyOn(authuserService, "isEmailTaken");
      spyOnEmail.mockResolvedValue(true);

      await validate(authuserValidation.addAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        email: ["email is already taken"],
      });
    });

    test("addAuthUser: should throw error 422, if the body contains any other parameter", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          email: "user@gmail.com",
          password: "Pass1word!",
          passwordConfirmation: "Pass1word!",
          id: "self", // this is not allowed
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnEmail = jest.spyOn(authuserService, "isEmailTaken");
      spyOnEmail.mockResolvedValue(false);

      await validate(authuserValidation.addAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        body: ["Any extra parameter is not allowed"],
      });
    });

    test("addAuthUser: should continue next middleware if the body elements are valid", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          email: "user@gmail.com",
          password: "Pass1word!",
          passwordConfirmation: "Pass1word!",
        },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnEmail = jest.spyOn(authuserService, "isEmailTaken");
      spyOnEmail.mockResolvedValue(false);

      await validate(authuserValidation.addAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("getAuthUser validation", () => {
    test("getAuthUser: should throw error 422, if the param id is not 24-length character", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "1234567890" }, // 10-length string, invalid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("getAuthUser: should continue next middleware if the param id is valid", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" }, // 24-length string, valid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    test("getAuthUser: should continue next middleware if the param id is self", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "self" }, // self is valid for here
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.getAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("toggleAbility validation", () => {
    test("toggleAbility: should throw error 422, if the param id is not 24-length character", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "1234567890" }, // 10-length string, invalid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.toggleAbility)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("toggleAbility: should throw error 422, if the param id is self", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "self" }, // self is not valid here
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.toggleAbility)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("toggleAbility: should continue next middleware if the param id is valid", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" }, // 24-length string, valid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.toggleAbility)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("toggleVerification validation", () => {
    test("toggleVerification: should throw error 422, if the param id is not 24-length character", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "1234567890" }, // 10-length string, invalid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.toggleVerification)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("toggleVerification: should throw error 422, if the param id is self", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "self" }, // self is not valid here
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.toggleVerification)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("toggleVerification: should continue next middleware if the param id is valid", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" }, // 24-length string, valid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.toggleVerification)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("unlinkProvider validation", () => {
    test("unlinkProvider: should throw error 422, if the param id is not 24-length character", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "1234567890" }, // 10-length string, invalid id
        query: { provider: authProvider.GOOGLE },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.unlinkProvider)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("unlinkProvider: should throw error 422, if the param id is self", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "self" }, // self is not valid here
        query: { provider: authProvider.EMAILPASSWORD },
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.unlinkProvider)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("unlinkProvider: should throw error 422, if the request doesn't contain any query param provider", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" }, // there is no query
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.unlinkProvider)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        provider: ["query param 'provider' is missing"],
      });
    });

    test("unlinkProvider: should throw error 422, if the query param provider is empty", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" },
        query: { provider: "" }, // it is empty
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.unlinkProvider)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        provider: ["query param 'provider' is missing"],
      });
    });

    test("unlinkProvider: should throw error 422, if the query param provider is not an auth provider", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" },
        query: { provider: "authprovider" }, // it is not emailpassword, google, or facebook
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.unlinkProvider)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        provider: ["The query param 'provider' should be an auth provider"],
      });
    });

    test("unlinkProvider: should throw error 422, if the both id and query param provider are invalid", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "1234567890" }, // 10-length string, invalid id
        query: { provider: "authprovider" }, // it is not emailpassword, google, or facebook
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.unlinkProvider)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
        provider: ["The query param 'provider' should be an auth provider"],
      });
    });

    test("unlinkProvider: should continue next middleware if the param id is valid and the valid provider is provided", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" }, // 24-length string, valid id
        query: { provider: authProvider.FACEBOOK }, // valid provider
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.unlinkProvider)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("deleteAuthUser validation", () => {
    test("deleteAuthUser: should throw error 422, if the param id is not 24-length character", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "1234567890" }, // 10-length string, invalid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.deleteAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("deleteAuthUser: should throw error 422, if the param id is self", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "self" }, // self is invalid here
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.deleteAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        id: ["The param id must be a 24-character number"],
      });
    });

    test("deleteAuthUser: should continue next middleware if the param id is valid", async () => {
      /** @type {httpMocks.RequestOptions} */
      const request = {
        params: { id: "123456789012345678901234" }, // 24-length string, valid id
      };

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await validate(authuserValidation.deleteAuthUser)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("change password validation", () => {
    test("changePassword: should throw error 422, if the body is empty", async () => {
      const authuser = new AuthUser("user@gmail.com", "password");

      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {},
      };

      request.authuser = authuser; // it is attached in authentication middleware

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnCurrentPassword = jest.spyOn(request.authuser, "isPasswordMatch");
      spyOnCurrentPassword.mockResolvedValue(Promise.resolve(true));

      await validate(authuserValidation.changePassword)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        currentPassword: ["must not be empty"],
        password: ["must not be empty"],
        passwordConfirmation: ["must not be empty"],
      });
    });

    test("changePassword: should throw error 422, if the email and password is empty", async () => {
      const authuser = new AuthUser("user@gmail.com", "password");

      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          currentPassword: "",
          password: "",
        },
      };

      request.authuser = authuser; // it is attached in authentication middleware

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnCurrentPassword = jest.spyOn(request.authuser, "isPasswordMatch");
      spyOnCurrentPassword.mockResolvedValue(Promise.resolve(true));

      await validate(authuserValidation.changePassword)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        currentPassword: ["must not be empty"],
        password: ["must not be empty"],
        passwordConfirmation: ["must not be empty"],
      });
    });

    test("changePassword: should throw error 422, if the password is less than 8 chararcters", async () => {
      const authuser = new AuthUser("user@gmail.com", "password");

      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          currentPassword: "AaAa1234!",
          password: "1234", // less than 8 characters
          passwordConfirmation: "", // empty
        },
      };

      request.authuser = authuser; // it is attached in authentication middleware

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnCurrentPassword = jest.spyOn(request.authuser, "isPasswordMatch");
      spyOnCurrentPassword.mockResolvedValue(Promise.resolve(true));

      await validate(authuserValidation.changePassword)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        password: ["must be minimum 8 characters"],
        passwordConfirmation: ["must not be empty"],
      });
    });

    test("changePassword: should throw error 422, if the password is not valid and confirmation does not match", async () => {
      const authuser = new AuthUser("user@gmail.com", "password");

      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          currentPassword: "AaAa1234!",
          password: "Password", // no number and special char
          passwordConfirmation: "Password+", // does not match with the password
        },
      };

      request.authuser = authuser; // it is attached in authentication middleware

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnCurrentPassword = jest.spyOn(request.authuser, "isPasswordMatch");
      spyOnCurrentPassword.mockResolvedValue(Promise.resolve(true));

      await validate(authuserValidation.changePassword)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        password: ["must contain uppercase, lowercase, number and special char"],
        passwordConfirmation: ["should match with the password"],
      });
    });

    test("changePassword: should throw error 422, if the current password is wrong", async () => {
      const authuser = new AuthUser("user@gmail.com", "password");

      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          currentPassword: "user@gmail.com",
          password: "Pass1word!",
          passwordConfirmation: "Pass1word!",
        },
      };

      request.authuser = authuser; // it is attached in authentication middleware

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnCurrentPassword = jest.spyOn(request.authuser, "isPasswordMatch");
      spyOnCurrentPassword.mockResolvedValue(Promise.resolve(false)); // means that the current password is wrong

      await validate(authuserValidation.changePassword)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(ApiError));

      // obtain the error from the next function
      const err = next.mock.calls[0][0];

      TestUtil.validationErrorInMiddleware(err);
      expect(err.errors).toEqual({
        currentPassword: ["incorrect current password"],
      });
    });

    test("changePassword: should continue next middleware if the body elements are valid", async () => {
      const authuser = new AuthUser("user@gmail.com", "password");

      /** @type {httpMocks.RequestOptions} */
      const request = {
        body: {
          currentPassword: "user@gmail.com",
          password: "Pass1word!",
          passwordConfirmation: "Pass1word!",
        },
      };

      request.authuser = authuser; // it is attached in authentication middleware

      const req = httpMocks.createRequest(request);
      const res = httpMocks.createResponse();
      const next = jest.fn();

      const spyOnCurrentPassword = jest.spyOn(request.authuser, "isPasswordMatch");
      spyOnCurrentPassword.mockResolvedValue(Promise.resolve(true));

      await validate(authuserValidation.changePassword)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
