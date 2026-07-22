
import { Router } from 'express';
import { createWebinarRegistration, getWebinarRegistrations } from '../controllers/webinarRegistration.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/webinar-registrations', createWebinarRegistration);
router.get('/webinar-registrations', authMiddleware(['ADMIN']), getWebinarRegistrations);

export default router;
