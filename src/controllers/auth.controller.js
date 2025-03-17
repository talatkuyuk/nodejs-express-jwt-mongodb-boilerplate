const { status: httpStatus } = require("http-status");
const asyncHandler = require("express-async-handler");

const { traceError } = require("../utils/errorUtils");
const { tokenTypes } = require("../config/tokens");

// SERVICE DEPENDENCIES
const { authService, tokenService, emailService } = require("../services");

const success = { success: true };

const signup = asyncHandler(
  /**
   * @typedef {Object} SignupBody
   * @property {string} email
   * @property {string} password
   *
   * @param {import('express').Request<{}, any, SignupBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.useragent?.source;

      const { authuser, isNewAuthuserCreated } = await authService.signupWithEmailAndPassword(
        email,
        password,
      );

      console.log("isNewAuthuserCreated: ", isNewAuthuserCreated);

      const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

      req.authuser = authuser; // for morgan logger to tokenize it as user

      res.set("X-New-Authuser", String(isNewAuthuserCreated));
      res.set("Access-Control-Expose-Headers", "X-New-Authuser");

      // TODO: control if it necessary, can a user get own info using this path ???
      res.location(`${req.protocol}://${req.get("host")}/authusers/${authuser.id}`);

      res
        .status(isNewAuthuserCreated ? httpStatus.CREATED : httpStatus.OK)
        .send({ success: true, data: { authuser: authuser.filter(), tokens } });
    } catch (error) {
      throw traceError(error, "AuthController : signup");
    }
  },
);

const login = asyncHandler(
  /**
   * @typedef {Object} LoginBody
   * @property {string} email
   * @property {string} password
   *
   * @param {import('express').Request<{}, any, LoginBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.useragent?.source;

      const authuser = await authService.checkAuthuserByEmail(email);
      await authService.checkPasswordMatchForLogin(authuser, password);

      const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

      req.authuser = authuser; // for morgan logger to tokenize it as user

      res
        .status(httpStatus.OK)
        .send({ success: true, data: { authuser: authuser.filter(), tokens } });
    } catch (error) {
      throw traceError(error, "AuthController : login");
    }
  },
);

const continueWithAuthProvider = asyncHandler(async (req, res) => {
  try {
    const { id, email } = req.oAuth.identity;
    const authProvider = req.oAuth.provider;
    const userAgent = req.useragent?.source;

    const { authuser, isNewAuthuserCreated } = await authService.continueWithAuthProvider(
      authProvider,
      id,
      email,
    );

    console.log("isNewAuthuserCreated: ", isNewAuthuserCreated);

    const tokens = await tokenService.generateAuthTokens(authuser.id, userAgent);

    res.set("X-New-Authuser", String(isNewAuthuserCreated));
    res.set("Access-Control-Expose-Headers", "X-New-Authuser");

    res
      .status(isNewAuthuserCreated ? httpStatus.CREATED : httpStatus.OK)
      .send({ success: true, data: { authuser: authuser.filter(), tokens } });
  } catch (error) {
    throw traceError(error, "AuthController : continueWithAuthProvider");
  }
});

const unlinkAuthProvider = asyncHandler(
  /**
   * @typedef {Object} RequestQuery
   * @property {import("../services/authProviders").AuthProvider} provider
   *
   * @param {import('express').Request<{}, any, any, RequestQuery>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { provider } = req.query;
      const { id, providers } = req.authuser;

      const authuser = await authService.unlinkAuthProvider(id, providers, provider);

      res.status(httpStatus.OK).send({ success: true, data: { authuser: authuser.filter() } });
    } catch (error) {
      throw traceError(error, "AuthController : unlinkAuthProvider");
    }
  },
);

const logout = asyncHandler(async (req, res) => {
  try {
    const id = req.authuser.id; // added in the authenticate middleware
    const jti = req.jti; // added in the authenticate middleware

    // delete the refresh token family from db
    await tokenService.findTokenAndRemoveFamily({ user: id, jti }, "family");

    await authService.logout(id, jti);

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "AuthController : logout");
  }
});

const signout = asyncHandler(async (req, res) => {
  try {
    const id = req.authuser.id; // added in the authenticate middleware
    const jti = req.jti; // added in the authenticate middleware

    // delete the whole tokens of the user from db
    await tokenService.findTokenAndRemoveFamily({ user: id, jti }, "user");

    await authService.signout(id, jti);

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "AuthController : signout");
  }
});

const refreshTokens = asyncHandler(
  /**
   * @typedef {Object} RefreshTokenBody
   * @property {string} refreshToken
   *
   * @param {import('express').Request<{}, any, RefreshTokenBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const userAgent = req.useragent?.source;

      const refreshTokenInstance = await tokenService.getRefreshToken(refreshToken);

      // ensure the refresh token blacklisted during RTR
      await tokenService.refreshTokenRotation(refreshTokenInstance, userAgent);

      const authuser = await authService.checkAuthuserById(refreshTokenInstance.user);
      req.authuser = authuser; // for morgan logger to tokenize it as user

      const tokens = await tokenService.generateAuthTokens(
        authuser.id,
        userAgent,
        refreshTokenInstance.family,
      );

      res.status(httpStatus.OK).send({ success: true, data: { tokens } });
    } catch (error) {
      throw traceError(error, "AuthController : refreshTokens");
    }
  },
);

const forgotPassword = asyncHandler(
  /**
   * @typedef {Object} ForgotPasswordBody
   * @property {string} email
   *
   * @param {import('express').Request<{}, any, ForgotPasswordBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { email } = req.body;

      const authuser = await authService.checkAuthuserByEmail(email);

      const resetPasswordToken = await tokenService.generateResetPasswordToken(authuser.id);

      await emailService.sendResetPasswordEmail(email, resetPasswordToken.token);

      req.authuser = authuser; // for morgan logger to tokenize it as user

      res.status(httpStatus.OK).send(success);
    } catch (error) {
      throw traceError(error, "AuthController : forgotPassword");
    }
  },
);

const resetPassword = asyncHandler(
  /**
   * @typedef {Object} ResetPasswordBody
   * @property {string} token
   * @property {string} password
   *
   * @param {import('express').Request<{}, any, ResetPasswordBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { token, password } = req.body;

      const { user: id } = await tokenService.verifyToken(token, tokenTypes.RESET_PASSWORD);

      const authuser = await authService.checkAuthuserById(id);
      const updatedAuthuser = await authService.resetPassword(authuser, password);

      await tokenService.removeTokens({ user: id, type: tokenTypes.RESET_PASSWORD });

      req.authuser = updatedAuthuser; // for morgan logger to tokenize it as user

      res.status(httpStatus.OK).send(success);
    } catch (error) {
      throw traceError(error, "AuthController : resetPassword");
    }
  },
);

const sendVerificationEmail = asyncHandler(async (req, res) => {
  try {
    const { id, email, isEmailVerified } = req.authuser;

    authService.handleEmailIsVerified(isEmailVerified);

    const verifyEmailToken = await tokenService.generateVerifyEmailToken(id);

    await emailService.sendVerificationEmail(email, verifyEmailToken.token);

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "AuthController : sendVerificationEmail");
  }
});

const verifyEmail = asyncHandler(
  /**
   * @typedef {Object} VerifyEmailBody
   * @property {string} token
   *
   * @param {import('express').Request<{}, any, VerifyEmailBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { token } = req.body;

      const { user: id } = await tokenService.verifyToken(token, tokenTypes.VERIFY_EMAIL);

      const authuser = await authService.checkAuthuserById(id);
      const updatedAuthuser = await authService.verifyEmail(authuser);

      await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.VERIFY_EMAIL });

      req.authuser = updatedAuthuser; // for morgan logger to tokenize it as user

      res.status(httpStatus.OK).send(success);
    } catch (error) {
      throw traceError(error, "AuthController : verifyEmail");
    }
  },
);

const sendSignupVerificationEmail = asyncHandler(async (req, res) => {
  try {
    const { id, email, providers } = req.authuser;

    authService.handleSignupIsVerified(providers?.emailpassword);

    const verifySignupToken = await tokenService.generateVerifySignupToken(id);

    await emailService.sendSignupVerificationEmail(email, verifySignupToken.token);

    res.status(httpStatus.OK).send(success);
  } catch (error) {
    throw traceError(error, "AuthController : sendSignupVerificationEmail");
  }
});

const verifySignup = asyncHandler(
  /**
   * @typedef {Object} VerifySignupBody
   * @property {string} token
   *
   * @param {import('express').Request<{}, any, VerifySignupBody, any>} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async (req, res) => {
    try {
      const { token } = req.body;

      const { user: id } = await tokenService.verifyToken(token, tokenTypes.VERIFY_SIGNUP);

      const authuser = await authService.checkAuthuserById(id);
      const updatedAuthuser = await authService.verifySignup(authuser);

      await tokenService.removeTokens({ user: authuser.id, type: tokenTypes.VERIFY_SIGNUP });

      req.authuser = updatedAuthuser; // for morgan logger to tokenize it as user

      res.status(httpStatus.OK).send(success);
    } catch (error) {
      throw traceError(error, "AuthController : verifySignup");
    }
  },
);

module.exports = {
  signup,
  login,
  continueWithAuthProvider,
  unlinkAuthProvider,
  logout,
  signout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  sendSignupVerificationEmail,
  verifySignup,
};
