const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/upload-license', authenticate, upload.single('license'), authController.uploadLicense);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
