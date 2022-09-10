const httpStatus = require("http-status");
const nodemailer = require("nodemailer");

const config = require("../config");
const logger = require("../core/logger");
const ApiError = require("../utils/ApiError");
const { traceError } = require("../utils/errorUtils");

const transporter = nodemailer.createTransport(config.email.smtp);

if (config.env !== "test") {
  transporter
    .verify()
    .then(() => logger.info("Connected to email server"))
    .catch(() =>
      logger.warn("Unable to connect to email server. Check the SMTP options.")
    );
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const message = { from: config.email.from, to, subject, text };

  try {
    await transporter.sendMail(message).then(console.log);
  } catch (error) {
    const { code, command, name, message, response, responseCode } = error;
    console.log({ code, command, name, message, response, responseCode });

    if (code && command && message.includes("Data command failed"))
      throw traceError(
        new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "SmtpError : SMTP server is out of service"
        ),
        "EmailService : sendEmail"
      );
    else
      throw traceError(
        new ApiError(httpStatus.BAD_REQUEST, `SmtpError : ${message}`),
        "EmailService : sendEmail"
      );
  }
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = "Reset password";
  const resetPasswordUrl = `${config.resetPasswordUrl}?token=${token}`;
  const text = `Dear user,\n\nTo reset your password, click on this link: ${resetPasswordUrl}\n\nIf you did not request any password resets, then ignore this email.`;

  try {
    await sendEmail(to, subject, text);
  } catch (error) {
    throw traceError(error, "EmailService : sendResetPasswordEmail");
  }
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = "Email Verification";
  const verifyEmailUrl = `${config.verifyEmailUrl}?token=${token}`;
  const text = `Dear user,\n\nTo verify your email, click the link: ${verifyEmailUrl}\n\nIf you did not create an account, then ignore this email.`;

  try {
    await sendEmail(to, subject, text);
  } catch (error) {
    throw traceError(error, "EmailService : sendVerificationEmail");
  }
};

/**
 * Send signup verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendSignupVerificationEmail = async (to, token) => {
  const subject = "Signup with email-password Verification";
  const verifySignuplUrl = `${config.verifySignupUrl}?token=${token}`;
  const text = `Dear user,\n\nVERY IMPORTANT:\nWe detected you registered with an auth provider before. You try to signup with the email and password as well. If you are not who made this action, DO NOT CLICK THE LINK BELOW, login to our web site and cancel the signup process. If you are the person who try to signup with the email-password, then ignore this warning.\n\nTo verify your signup with email-password process, click the link: ${verifySignuplUrl}`;

  try {
    await sendEmail(to, subject, text);
  } catch (error) {
    throw traceError(error, "EmailService : sendVerificationEmail");
  }
};

module.exports = {
  transporter, // it is exported for mocking in jest
  sendEmail, // it is exported for mocking in jest
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendSignupVerificationEmail,
};
