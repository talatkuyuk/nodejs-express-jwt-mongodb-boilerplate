const express = require('express');
const router = express.Router();

const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const { authuserController } = require('../controllers');
const authuserValidation = require('../validations/authuser.ValidationRules');


router.post('/', auth('add-authuser'), validate(authuserValidation.addAuthUser), authuserController.addAuthUser);
router.get('/:id', auth('get-authuser'), validate(authuserValidation.getAuthUser), authuserController.getAuthUser);
router.get('/', auth('query-authusers'), validate(authuserValidation.getAuthUsers), authuserController.getAuthUsers);
router.put('/:id', auth('toggle-authuser'), validate(authuserValidation.toggleAuthUser), authuserController.toggleAbility);
router.delete('/:id', auth('delete-authuser'), validate(authuserValidation.deleteAuthUser), authuserController.deleteAuthUser);
router.patch('/password', auth("change-password"), validate(authuserValidation.changePassword), authuserController.changePassword);

module.exports = router;
