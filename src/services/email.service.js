const nodemailer = require('nodemailer');

const config = require('../config');
const logger = require('../core/logger');
const { locateError } = require('../utils/errorUtils');


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
		const {code, response, responseCode, command} = error;
		console.log({code, response, responseCode, command});
		throw locateError(error, "EmailService : sendEmail");
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
		throw locateError(error, "EmailService : sendResetPasswordEmail");
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
		throw locateError(error, "EmailService : sendVerificationEmail");
	}
};

module.exports = {
  transporter, // it is exported for mocking in jest
  sendResetPasswordEmail,
  sendVerificationEmail,
};
