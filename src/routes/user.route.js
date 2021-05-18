const express = require('express');

const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const { userController } = require('../controllers');
const userValidation = require('../validations/user.ValidationRules');

const router = express.Router({ strict: true }); // to handle /joined/ path

router.post('/', auth('add-user'), validate(userValidation.addUser), userController.addUser);
router.get('/:id', auth('get-user'), validate(userValidation.getUser), userController.getUser);
router.get('/', auth('query-users'), validate(userValidation.getUsers), userController.getUsers);
router.get('/joined/', auth('query-users-joined'), validate(userValidation.getUsers), userController.getUsersJoined);
router.patch('/:id', auth('update-user'), validate(userValidation.updateUser), userController.updateUser);
router.put('/:id', auth('change-role'), validate(userValidation.changeRole), userController.changeRole);
router.delete('/:id', auth('delete-user'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
