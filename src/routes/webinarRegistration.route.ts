
import { Router } from 'express';
import { createWebinarRegistration, getWebinarRegistrations } from '../controllers/webinarRegistration.controller';
import { authorize } from '../middlewares/auth';

const router = Router();

router.post('/', createWebinarRegistration);
router.get('/', authorize('ADMIN'), getWebinarRegistrations);

export const webinarRegistrationRouter = router;
