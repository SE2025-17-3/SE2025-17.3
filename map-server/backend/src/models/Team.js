import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  memberCount: {
    type: Number,
    default: 1,
    min: 0,
  },
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);
