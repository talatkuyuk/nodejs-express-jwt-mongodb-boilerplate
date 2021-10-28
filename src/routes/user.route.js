const express = require('express');
const router = express.Router();

const { authenticate, authorize, validate } = require('../middlewares');

const { userController } = require('../controllers');

const userValidation = require('../validations/user.ValidationRules');


router.get('/', authenticate, authorize('query-users'), validate(userValidation.getUsers), userController.getUsers);
router.post('/:id', authenticate, authorize('add-user'), validate(userValidation.addUser), userController.addUser);
router.get('/:id', authenticate, authorize('get-user'), validate(userValidation.getUser), userController.getUser);
router.put('/:id', authenticate, authorize('update-user'), validate(userValidation.updateUser), userController.updateUser);
router.patch('/:id', authenticate, authorize('change-role'), validate(userValidation.changeRole), userController.changeRole);
router.delete('/:id', authenticate, authorize('delete-user'), validate(userValidation.deleteUser), userController.deleteUser);


module.exports = router;
