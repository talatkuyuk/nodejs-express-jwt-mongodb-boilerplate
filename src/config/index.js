const path = require('path');
const Joi = require('joi');

require('dotenv-safe').config({ example: path.join(__dirname , '../../.env.example') });

//dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
    PORT_HTTP: Joi.number().default(3000),
	  PORT_HTTPS: Joi.number().default(8443),
    WHICH_SERVER: Joi.string().valid('http', 'https', 'both').default('http'),
    MONGODB_URL: Joi.string().required().description('Mongodb url'),
    MONGODB_URL_QUERY_OPTIONS: Joi.string().description('Mongodb url query options that is going to be added'),
    REDIS_URL: Joi.string().required().description('Redis url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(20).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number().default(60).description('minutes after which reset-password tokens expire'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number().default(3600).description('minutes after which verify-email tokens expire'),
	  GOOGLE_OAUTH_CLIENTID: Joi.string().description('Google ClientID for google-sign-in'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    RESET_PASSWORD_URL: Joi.string().description('reset password url of frontend application'),
    VERIFY_EMAIL_URL: Joi.string().description('verify email url of frontend application'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  error.description || (error.description = "Environment variable validation failed in Config");
  throw error;
}

module.exports = {
  env: envVars.NODE_ENV,
  porthttp: envVars.PORT_HTTP,
  porthttps: envVars.PORT_HTTPS,
  server: envVars.WHICH_SERVER,
  mongodb_url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : '') + envVars.MONGODB_URL_QUERY_OPTIONS,
  mongodb_database: envVars.MONGODB_URL.split("/").pop(), // get the db name from url string
  redis_url: envVars.REDIS_URL,
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  google_client_id:envVars.GOOGLE_OAUTH_CLIENTID,
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
	  secure: false,  // TODO: STARTTLS
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  resetPasswordUrl: envVars.RESET_PASSWORD_URL,
  verifyEmailUrl: envVars.VERIFY_EMAIL_URL,
};