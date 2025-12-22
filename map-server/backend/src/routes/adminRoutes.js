// map-server/backend/src/routes/adminRoutes.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import { 
    getAllUsers, 
    toggleAdminRole, 
    banUser, 
    deleteUserFull, 
    wipeArea, 
    getAppeals, 
    resolveAppeal,
    dissolveTeam // <--- IMPORT MỚI
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/users', getAllUsers);
router.post('/toggle-role', toggleAdminRole);
router.post('/ban-user', banUser);
router.post('/delete-user', deleteUserFull);
router.post('/wipe-area', wipeArea);
router.get('/appeals', getAppeals);
router.post('/resolve-appeal', resolveAppeal);
router.post('/dissolve-team', dissolveTeam);

export default router;