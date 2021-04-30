const express = require('express');

const { userController } = require('../controllers');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const userValidation = require('../validations/userValidationRules');

const router = express.Router();

router.get('/', auth('query-users'), validate(userValidation.getUsers), userController.getUsers);
router.post('/', auth('add-user'), validate(userValidation.addUser), userController.addUser);
router.get('/:id', auth('get-user'), validate(userValidation.getUser), userController.getUser);
router.patch('/:id', auth('update-user'), validate(userValidation.updateUser), userController.updateUser);
router.delete('/:id', auth('delete-user'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
