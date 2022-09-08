const request = require("supertest");
const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = require("../../src/core/express");
const config = require("../../src/config");

const {
  authuserDbService,
  tokenDbService,
  emailService,
} = require("../../src/services");
const { AuthUser } = require("../../src/models");
const { tokenTypes } = require("../../src/config/tokens");

const TestUtil = require("../testutils/TestUtil");

const { setupTestDatabase } = require("../setup/setupTestDatabase");

setupTestDatabase();

describe("POST /auth/forgot-password", () => {
  describe("Request Validation (email) Errors", () => {
    test("should return 422 Validation Error if email is empty", async () => {
      const forgotPasswordForm = {};

      const response = await request(app)
        .post("/auth/forgot-password")
        .send(forgotPasswordForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.email).toEqual(["must not be empty"]);
    });

    test("should return 422 Validation Error if email is invalid form", async () => {
      const forgotPasswordForm = { email: "talat1@com" };

      const response = await request(app)
        .post("/auth/forgot-password")
        .send(forgotPasswordForm);

      TestUtil.validationErrorExpectations(response);
      expect(response.body.error.errors.email).toEqual([
        "must be valid email address",
      ]);
    });
  });

  describe("Failed forgot-password process", () => {
    test("should return status 404, if there is no user with the email", async () => {
      const forgotPasswordForm = { email: "talat@gmail.com" };

      const response = await request(app)
        .post("/auth/forgot-password")
        .send(forgotPasswordForm);

      TestUtil.errorExpectations(response, httpStatus.NOT_FOUND);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toEqual("No user found");
    });

    test("should return status 500, if the email service does not respond", async () => {
      const authuserx = AuthUser.fromDoc({
        email: "talat@gmail.com",
        password: await bcrypt.hash("Pass1word.", 8),
      });

      // ad the authuserx into db
      const authuser = await authuserDbService.addAuthUser(authuserx);

      const smtpResponse = {
        code: "EENVELOPE",
        response:
          "421 Domain xx.mailgun.org is not allowed to send: Sandbox subdomains are for test purposes only. Please add your own domain or add the address to authorized recipients in Account Settings.",
        responseCode: 421,
        command: "DATA",
        name: "Error",
        message:
          "Data command failed: 421 Domain xx.mailgun.org is not allowed to send: Sandbox subdomains are for test purposes only. Please add your own domain or add the address to authorized recipients in Account Settings.",
      };

      // spy on transporter to produce error
      jest
        .spyOn(emailService.transporter, "sendMail")
        .mockImplementation(() => Promise.reject(smtpResponse));

      const forgotPasswordForm = { email: authuser.email };
      const response = await request(app)
        .post("/auth/forgot-password")
        .send(forgotPasswordForm);

      TestUtil.errorExpectations(response, httpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.error.name).toBe("SmtpError");
      expect(response.body.error.message).toEqual(
        "SMTP server is out of service"
      );
    });

    test("should return status 400, if the email recipient is empty", async () => {
      const authuserx = AuthUser.fromDoc({
        email: "talat@gmail.com",
        password: await bcrypt.hash("Pass1word.", 8),
      });

      // ad the authuserx into db
      const authuser = await authuserDbService.addAuthUser(authuserx);

      const smtpResponse = {
        code: "EENVELOPE",
        command: "API",
        name: "Error",
        message: "No recipients defined",
      };

      // spy on transporter to produce error
      jest
        .spyOn(emailService.transporter, "sendMail")
        .mockImplementation(() => Promise.reject(smtpResponse));

      const forgotPasswordForm = { email: authuser.email };
      const response = await request(app)
        .post("/auth/forgot-password")
        .send(forgotPasswordForm);

      TestUtil.errorExpectations(response, httpStatus.BAD_REQUEST);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toEqual("No recipients defined");
    });
  });

  describe("Success forgot-password process", () => {
    test("should return status 204, generate and store reset-password token in db", async () => {
      const authuserx = AuthUser.fromDoc({
        email: "talat@gmail.com",
        password: await bcrypt.hash("Pass1word.", 8),
      });

      // ad the authuserx into db
      const authuser = await authuserDbService.addAuthUser(authuserx);

      // spy on transporter and sendResetPasswordEmail of the emailService
      jest
        .spyOn(emailService.transporter, "sendMail")
        .mockResolvedValue("The reset password email is sent.");
      const spyOnSendResetPasswordEmail = jest.spyOn(
        emailService,
        "sendResetPasswordEmail"
      );

      const forgotPasswordForm = { email: authuser.email };
      const response = await request(app)
        .post("/auth/forgot-password")
        .send(forgotPasswordForm);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);

      expect(spyOnSendResetPasswordEmail).toHaveBeenCalledWith(
        authuser.email,
        expect.any(String)
      );

      // obtain the token from the function on that spied
      const resetPasswordToken = spyOnSendResetPasswordEmail.mock.calls[0][1];

      // check the reset password token belongs to the authuser
      const { sub } = jwt.decode(resetPasswordToken, config.jwt.secret);
      expect(sub).toEqual(authuser.id);

      // check the reset password token is stored in db
      const resetPasswordTokenDoc = await tokenDbService.getToken({
        token: resetPasswordToken,
        user: authuser.id,
        type: tokenTypes.RESET_PASSWORD,
      });
      expect(resetPasswordTokenDoc.user).toEqual(authuser.id);
    });
  });
});
