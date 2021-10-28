const express = require('express');
const router = express.Router();

const { authenticate, authorize, validate } = require('../middlewares');

const { joinedController } = require('../controllers');

const { getAuthUsers } = require('../validations/authuser.ValidationRules');
const { getUsers } = require('../validations/user.ValidationRules');



router.get('/authusers', authenticate, authorize('query-authusers-joined'), validate(getAuthUsers), joinedController.getAuthUsersJoined);
router.get('/users', authenticate, authorize('query-users-joined'), validate(getUsers), joinedController.getAuthUsersJoined);



module.exports = router;
