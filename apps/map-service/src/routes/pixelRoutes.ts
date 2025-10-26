import { Router } from 'express';
import { getChunk, createPixel } from '../controllers/pixelController';

const router = Router();

// Get chunk of pixels
router.get('/pixels/chunk/:chunkX/:chunkY', getChunk);

// Create or update pixel
router.post('/pixels', createPixel);

export default router;
