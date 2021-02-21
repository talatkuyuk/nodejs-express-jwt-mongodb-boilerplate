// const httpStatus = require('http-status');
// const catchAsync = require('../utils/catchAsync');
// const { authService, userService, tokenService, emailService } = require('../services');

// const register = catchAsync(async (req, res) => {
//     const user = await userService.createUser(req.body);
//     const tokens = await tokenService.generateAuthTokens(user);
//     res.status(httpStatus.CREATED).send({ user, tokens });
// });

const signup = (req, res) => {
    res.json({
        username: req.body.username,
        password: req.body.password,
        passwordConfirmation: req.body.password,
    });
}

const login = (req, res) => {
    res.json({
        username: req.body.username,
        password: req.body.password,
    });
}

module.exports = {
    signup,
    login,
    // logout,
    // refreshTokens,
    // forgotPassword,
    // resetPassword,
};