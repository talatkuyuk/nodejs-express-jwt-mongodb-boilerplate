const httpStatus = require('http-status');
const nodemailer = require('nodemailer');

const config = require('../config');
const logger = require('../core/logger');
const ApiError = require('../utils/ApiError');
const { traceError } = require('../utils/errorUtils');


const transporter = nodemailer.createTransport(config.email.smtp);

if (config.env !== 'test') {
  transporter
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Check the SMTP options.'));
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
		const {code,  command, name, message, response, responseCode} = error;
		console.log({code,  command, name, message, response, responseCode});

		if (code && command && message.includes("Data command failed"))
			throw traceError(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "SmtpError : SMTP server is out of service"), "EmailService : sendEmail");
		else if (code && command)
			throw traceError(new ApiError(httpStatus.BAD_REQUEST, `ApiError : ${message}`), "EmailService : sendEmail");
		else
			throw traceError(error, "EmailService : sendEmail");
	}
};


/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
	const subject = 'Reset password';
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
	const subject = 'Email Verification';
	const verificationEmailUrl = `${config.verifyEmailUrl}?token=${token}`;
	const text = `Dear user,\n\nTo verify your email, click on this link: ${verificationEmailUrl}\n\nIf you did not create an account, then ignore this email.`;

	try {
		await sendEmail(to, subject, text);

	} catch (error) {
		throw traceError(error, "EmailService : sendVerificationEmail");
	}
};

module.exports = {
  transporter, // it is exported for mocking in jest
  sendResetPasswordEmail,
  sendVerificationEmail,
};
