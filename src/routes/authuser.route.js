const express = require('express');
const router = express.Router();

const { authenticate, authorize, validate } = require('../middlewares');

const { authuserController } = require('../controllers');

const authuserValidation = require('../validations/authuser.ValidationRules');


router.get('/', authenticate, authorize('query-authusers'), validate(authuserValidation.getAuthUsers), authuserController.getAuthUsers);
router.post('/', authenticate, authorize('add-authuser'), validate(authuserValidation.addAuthUser), authuserController.addAuthUser);
router.get('/:id', authenticate, authorize('get-authuser'), validate(authuserValidation.getAuthUser), authuserController.getAuthUser);
router.put('/:id', authenticate, authorize('toggle-authuser'), validate(authuserValidation.toggleAuthUser), authuserController.toggleAbility);
router.delete('/:id', authenticate, authorize('delete-authuser'), validate(authuserValidation.deleteAuthUser), authuserController.deleteAuthUser);
router.patch('/password', authenticate, authorize("change-password"), validate(authuserValidation.changePassword), authuserController.changePassword);

module.exports = router;
