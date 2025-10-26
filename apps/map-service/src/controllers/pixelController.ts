import { Request, Response } from 'express';
import { Pixel } from '../models/Pixel';
import { CHUNK_SIZE } from '../config/constants';
import { getIO } from '../socket/socketManager';

/**
 * Get pixels in a specific chunk
 */
export const getChunk = async (req: Request, res: Response): Promise<void> => {
  try {
    const chunkX = parseInt(req.params.chunkX, 10);
    const chunkY = parseInt(req.params.chunkY, 10);

    // Calculate grid coordinate range for the requested chunk
    const gx_min = chunkX * CHUNK_SIZE;
    const gx_max = (chunkX + 1) * CHUNK_SIZE;
    const gy_min = chunkY * CHUNK_SIZE;
    const gy_max = (chunkY + 1) * CHUNK_SIZE;

    // Query MongoDB to get only pixels within this range
    const pixels = await Pixel.find({
      gx: { $gte: gx_min, $lt: gx_max },
      gy: { $gte: gy_min, $lt: gy_max }
    }).select('gx gy color -_id');

    res.json(pixels);
  } catch (err) {
    console.error('Lỗi khi lấy chunk:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu chunk' });
  }
};

/**
 * Create or update a pixel
 */
export const createPixel = async (req: Request, res: Response): Promise<void> => {
  const { gx, gy, color } = req.body;
  
  try {
    const updatedPixel = await Pixel.findOneAndUpdate(
      { gx, gy },
      { color, updated_at: new Date() },
      { new: true, upsert: true, select: 'gx gy color' }
    );

    // Broadcast to all connected clients
    const io = getIO();
    io.emit('pixel_placed', updatedPixel);

    res.status(201).json(updatedPixel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
