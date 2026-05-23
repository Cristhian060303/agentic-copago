import { Router } from 'express';
import { loadHospitals } from '../services/estimator.js';

const router = Router();
router.get('/', (_req, res) => res.json(loadHospitals()));
export default router;