import { Router } from 'express';
import { authRouter } from './app/auth/auth.route';

export const router = Router();

router.use('/auth', authRouter);

