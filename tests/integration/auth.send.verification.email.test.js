const request = require("supertest");
const httpStatus = require("http-status");
const jwt = require("jsonwebtoken");

const app = require("../../src/core/express");

const { authuserDbService, tokenDbService, emailService } = require("../../src/services");
const { tokenTypes } = require("../../src/config/tokens");

const TestUtil = require("../testutils/TestUtil");

const { setupTestDatabase } = require("../setup/setupTestDatabase");
const { setupRedis } = require("../setup/setupRedis");

setupTestDatabase();
setupRedis();

describe("POST /auth/send-verification-email", () => {
  const userAgent = "from-jest-test";

  /** @type {string} */
  let accessToken;

  /** @type {string} */
  let authuserId;

  /** @type {string} */
  let authuserEmail;

  beforeEach(async () => {
    const { authuser, tokens } = await TestUtil.createAuthUser(userAgent, {
      email: "talat@google.com",
      password: "Pass1word!",
    });

    authuserId = authuser.id;
    authuserEmail = authuser.email;
    accessToken = tokens.access.token;
  });

  describe("Failed send-verification-email process", () => {
    test("should return status 400, if the email is already verified", async () => {
      // update the authuser with isEmailVerifid true
      await authuserDbService.updateAuthUser(authuserId, {
        isEmailVerified: true,
      });

      const response = await request(app)
        .post("/auth/send-verification-email")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.errorExpectations(response, httpStatus.BAD_REQUEST);
      expect(response.body.error.name).toBe("ApiError");
      expect(response.body.error.message).toEqual("Email is already verified");
    });

    test("should return status 500, if the email service does not respond", async () => {
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

      const response = await request(app)
        .post("/auth/send-verification-email")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.errorExpectations(response, httpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.error.name).toBe("SmtpError");
      expect(response.body.error.message).toEqual("SMTP server is out of service");
    });

    test("should return status 400, if the email recipient is empty", async () => {
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

      const response = await request(app)
        .post("/auth/send-verification-email")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      TestUtil.errorExpectations(response, httpStatus.BAD_REQUEST);
      expect(response.body.error.name).toBe("SmtpError");
      expect(response.body.error.message).toEqual("No recipients defined");
    });
  });

  describe("Success send-verification-email process", () => {
    test("should return status 204, generate and store verify-email token in db", async () => {
      // spy on transporter and resolve interface SentMessageInfo
      jest.spyOn(emailService.transporter, "sendMail").mockResolvedValue(
        Promise.resolve({
          envelope: { from: "from@xxx.com", to: ["to@xxx.com"] },
          messageId: "fake-message-id",
          accepted: ["to@xxx.com"],
          rejected: [],
          pending: [],
          response: "The verification email is sent.",
        }),
      );

      // spy on sendVerificationEmail of the emailService
      const spyOnSendVerificationEmail = jest.spyOn(emailService, "sendVerificationEmail");

      const response = await request(app)
        .post("/auth/send-verification-email")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("User-Agent", userAgent)
        .send();

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.success).toBe(true);

      expect(spyOnSendVerificationEmail).toHaveBeenCalledWith(
        authuserEmail,
        expect.any(String),
      );

      // obtain the token from the function on that spied
      const verifyEmailToken = spyOnSendVerificationEmail.mock.calls[0][1];

      // check the verify email token belongs to the authuser
      const payload = jwt.decode(verifyEmailToken, { json: true });
      expect(payload?.sub).toEqual(authuserId);

      // check the verify email token is stored in db
      const verifyEmailTokenInstance = await tokenDbService.getToken({
        token: verifyEmailToken,
        user: authuserId,
        type: tokenTypes.VERIFY_EMAIL,
      });

      expect(verifyEmailTokenInstance?.user).toEqual(authuserId);
    });
  });
});
