import mongoose, { Schema, Model } from 'mongoose';

export interface IPixel {
  gx: number;
  gy: number;
  color: string;
  updated_at?: Date;
}

const pixelSchema = new Schema<IPixel>({
  gx: { type: Number, required: true },
  gy: { type: Number, required: true },
  color: { type: String, default: '#000000' },
  updated_at: { type: Date, default: Date.now }
});

// Create compound index for efficient queries
pixelSchema.index({ gx: 1, gy: 1 }, { unique: true });

export const Pixel: Model<IPixel> = mongoose.model<IPixel>('Pixel', pixelSchema);
