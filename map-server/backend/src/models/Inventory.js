// backend/src/models/Inventory.js
import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    ref: 'StoreItem'
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  acquiredAt: {
    type: Date,
    default: Date.now
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const inventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  items: [inventoryItemSchema],
  // Track purchases for daily limits
  dailyPurchases: {
    type: Map,
    of: {
      count: Number,
      lastReset: Date
    },
    default: new Map()
  }
}, {
  timestamps: true
});

// Method to add item to inventory
inventorySchema.methods.addItem = function(itemId, quantity = 1, expiresAt = null) {
  const existingItem = this.items.find(item => item.itemId === itemId && !item.usedAt);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      itemId,
      quantity,
      acquiredAt: new Date(),
      expiresAt
    });
  }
  
  return this;
};

// Method to use/consume item
inventorySchema.methods.useItem = function(itemId, quantity = 1) {
  const item = this.items.find(i => i.itemId === itemId && !i.usedAt && i.quantity > 0);
  
  if (!item) {
    throw new Error('Item not found in inventory');
  }
  
  if (item.quantity < quantity) {
    throw new Error('Insufficient quantity');
  }
  
  item.quantity -= quantity;
  
  if (item.quantity === 0) {
    item.usedAt = new Date();
  }
  
  return this;
};

// Method to check daily purchase limit
inventorySchema.methods.canPurchase = function(itemId, dailyLimit) {
  if (!dailyLimit) return true; // No limit
  
  const today = new Date().toISOString().split('T')[0];
  const purchaseData = this.dailyPurchases.get(itemId);
  
  if (!purchaseData) {
    return true;
  }
  
  const lastResetDate = new Date(purchaseData.lastReset).toISOString().split('T')[0];
  
  // Reset if it's a new day
  if (lastResetDate !== today) {
    return true;
  }
  
  return purchaseData.count < dailyLimit;
};

// Method to record purchase for daily limit tracking
inventorySchema.methods.recordPurchase = function(itemId) {
  const today = new Date().toISOString().split('T')[0];
  const purchaseData = this.dailyPurchases.get(itemId);
  
  if (!purchaseData || new Date(purchaseData.lastReset).toISOString().split('T')[0] !== today) {
    this.dailyPurchases.set(itemId, {
      count: 1,
      lastReset: new Date()
    });
  } else {
    purchaseData.count += 1;
    this.dailyPurchases.set(itemId, purchaseData);
  }
  
  return this;
};

// Static method to get or create inventory
inventorySchema.statics.getOrCreateInventory = async function(userId) {
  let inventory = await this.findOne({ userId });
  
  if (!inventory) {
    inventory = await this.create({
      userId,
      items: [],
      dailyPurchases: new Map()
    });
  }
  
  return inventory;
};

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;
