const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.get('/', branchController.listBranches);
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), branchController.createBranch);
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), branchController.updateBranch);

module.exports = router;
