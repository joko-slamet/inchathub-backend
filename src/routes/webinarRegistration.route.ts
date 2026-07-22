
import { Router } from 'express';
import { Role } from '../generated/prisma/enums';
import { createWebinarRegistration, getWebinarRegistrations } from '../controllers/webinarRegistration.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', asyncHandler(createWebinarRegistration));
router.get('/', authenticate, authorize(Role.ADMIN), asyncHandler(getWebinarRegistrations));

export const webinarRegistrationRouter = router;
