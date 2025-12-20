// backend/src/models/StoreItem.js
import mongoose from 'mongoose';

const storeItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['energy_boost', 'capacity_upgrade', 'cosmetic', 'premium'],
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  effect: {
    type: {
      type: String,
      enum: ['instant_energy', 'max_capacity', 'cosmetic', 'buff'],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    // For buffs/temporary effects
    duration: {
      type: Number, // in milliseconds
      default: null
    }
  },
  icon: {
    type: String,
    default: '💧'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dailyLimit: {
    type: Number,
    default: null // null = unlimited
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for active items sorted by category and order
storeItemSchema.index({ isActive: 1, category: 1, sortOrder: 1 });

// Static method to get all active items
storeItemSchema.statics.getActiveItems = async function(category = null) {
  const query = { isActive: true };
  if (category) {
    query.category = category;
  }
  
  return await this.find(query).sort({ sortOrder: 1, price: 1 }).lean();
};

// Static method to get item by ID
storeItemSchema.statics.getItemById = async function(itemId) {
  return await this.findOne({ itemId, isActive: true }).lean();
};

const StoreItem = mongoose.model('StoreItem', storeItemSchema);

export default StoreItem;
