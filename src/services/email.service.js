const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../core/logger');

const transporter = nodemailer.createTransport(config.email.smtp);

/* istanbul ignore next */
if (config.env !== 'test') {
  transporter
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
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
  
	transporter.sendMail(message, (error, info) => {
		if (error) throw error;
		console.log(info);
	});
  
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
	const subject = 'Reset password';
	const resetPasswordUrl = `http://localhost:3000/auth/reset-password?token=${token}`;
	const text = `Dear user,\n\nTo reset your password, click on this link: ${resetPasswordUrl}\n\nIf you did not request any password resets, then ignore this email.`;

  	await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
	const subject = 'Email Verification';
	const verificationEmailUrl = `http://localhost:3000/auth/verify-email?token=${token}`;
	const text = `Dear user,\n\nTo verify your email, click on this link: ${verificationEmailUrl}\n\nIf you did not create an account, then ignore this email.`;

  	await sendEmail(to, subject, text);
};

module.exports = {
  transporter,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
};
