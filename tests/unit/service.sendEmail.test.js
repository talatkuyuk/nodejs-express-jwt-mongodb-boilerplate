const httpStatus = require("http-status");

const { emailService } = require("../../src/services");
const ApiError = require("../../src/utils/ApiError");

const TestUtil = require("../testutils/TestUtil");

describe("Failed send-verification-email process", () => {
  TestUtil.MatchErrors();

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

    const expectedError = new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "SmtpError: SMTP server is out of service"
    );

    expect(() =>
      emailService.sendEmail("t@g.com", "subject", "body-text")
    ).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
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

    const expectedError = new ApiError(
      httpStatus.BAD_REQUEST,
      "SmtpError: No recipients defined"
    );

    expect(() =>
      emailService.sendEmail("", "subject", "body-text")
    ).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
  });

  test("should return status 500, if the email recipient is empty", async () => {
    const smtpResponse = {
      code: "EENVELOPE",
      name: "Error",
      message: "the error message",
    };

    // spy on transporter to produce error
    jest
      .spyOn(emailService.transporter, "sendMail")
      .mockImplementation(() => Promise.reject(smtpResponse));

    const expectedError = new ApiError(
      httpStatus.BAD_REQUEST,
      "SmtpError: the error message"
    );

    expect(() =>
      emailService.sendEmail("t@g.com", "subject", "body-text")
    ).rejects.toThrow(expect.toBeMatchedWithError(expectedError));
  });
});
