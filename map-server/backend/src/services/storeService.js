// backend/src/services/storeService.js
import StoreItem from '../models/StoreItem.js';
import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import * as walletService from './walletService.js';
import mongoose from 'mongoose';

/**
 * Get all store items or by category
 */
export const getStoreItems = async (category = null) => {
  return await StoreItem.getActiveItems(category);
};

/**
 * Get a specific store item
 */
export const getStoreItem = async (itemId) => {
  const item = await StoreItem.getItemById(itemId);
  if (!item) {
    throw new Error('Item not found or inactive');
  }
  return item;
};

/**
 * Purchase an item from the store
 */
export const purchaseItem = async (userId, itemId, quantity = 1) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // 1. Get store item
      const item = await StoreItem.findOne({ itemId, isActive: true }).session(session);
      if (!item) {
        throw new Error('Item not found or not available');
      }

      // 2. Get or create inventory
      const inventory = await Inventory.getOrCreateInventory(userId);

      // 3. Check daily limit
      if (item.dailyLimit && !inventory.canPurchase(itemId, item.dailyLimit)) {
        throw new Error(`Daily purchase limit reached for ${item.name}`);
      }

      // 4. Calculate total cost
      const totalCost = item.price * quantity;

      // 5. Deduct droplets (this includes transaction logging)
      await walletService.deductDroplets(userId, totalCost, `store_purchase_${itemId}`, {
        itemId,
        itemName: item.name,
        quantity,
        unitPrice: item.price
      });

      // 6. Apply item effect immediately based on type
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      let effectResult = null;

      switch (item.effect.type) {
        case 'instant_energy':
          // Add energy charges immediately
          effectResult = await applyEnergyBoost(user, item.effect.value, session, quantity);
          break;

        case 'max_capacity':
          // Increase max energy capacity permanently
          effectResult = await increaseMaxCapacity(user, item.effect.value, session, quantity);
          break;

        case 'cosmetic':
          // Add to inventory for cosmetics
          inventory.addItem(itemId, quantity);
          await inventory.save({ session });
          effectResult = { type: 'cosmetic', added: true };
          break;

        case 'buff':
          // Add temporary buff (not implemented in detail here)
          inventory.addItem(itemId, quantity, new Date(Date.now() + item.effect.duration));
          await inventory.save({ session });
          effectResult = { type: 'buff', duration: item.effect.duration };
          break;
      }

      // 7. Record purchase for daily limit tracking
      if (item.dailyLimit) {
        inventory.recordPurchase(itemId);
        await inventory.save({ session });
      }

      result = {
        success: true,
        item: {
          itemId: item.itemId,
          name: item.name,
          quantity
        },
        cost: totalCost,
        effect: effectResult
      };
    });

    return result;
  } catch (error) {
    throw new Error(`Purchase failed: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Apply instant energy boost
 * 1 Droplet = 30 paint charges
 */
const applyEnergyBoost = async (user, dropletsSpent, session, quantity = 1) => {
  // dropletsSpent is the effect.value (droplets per item)
  // quantity is how many items purchased
  const totalDroplets = dropletsSpent * quantity;
  const energyToAdd = totalDroplets * 30; // 1 droplet = 30 charges

  const newEnergy = Math.min(user.maxEnergy, user.energy + energyToAdd);
  const actualAdded = newEnergy - user.energy;

  user.energy = newEnergy;
  await user.save({ session });

  return {
    type: 'instant_energy',
    energyAdded: actualAdded,
    currentEnergy: user.energy,
    maxEnergy: user.maxEnergy,
    wasted: energyToAdd - actualAdded // If capped at max
  };
};

/**
 * Increase max energy capacity permanently
 * 1 Droplet = +5 max capacity
 */
const increaseMaxCapacity = async (user, dropletsSpent, session, quantity = 1) => {
  // dropletsSpent is the effect.value (droplets per item)
  // quantity is how many items purchased
  const totalDroplets = dropletsSpent * quantity;
  const capacityIncrease = totalDroplets * 5; // 1 droplet = 5 max capacity

  const oldMaxEnergy = user.maxEnergy;
  user.maxEnergy += capacityIncrease;
  await user.save({ session });

  return {
    type: 'max_capacity',
    capacityIncrease,
    oldMaxEnergy,
    newMaxEnergy: user.maxEnergy
  };
};

/**
 * Get user's purchase history for an item (for daily limits)
 */
export const getUserPurchaseLimits = async (userId) => {
  const inventory = await Inventory.getOrCreateInventory(userId);
  const itemsWithLimits = await StoreItem.find({ isActive: true, dailyLimit: { $ne: null } }).lean();

  const limits = itemsWithLimits.map(item => {
    const purchaseData = inventory.dailyPurchases.get(item.itemId);
    const today = new Date().toISOString().split('T')[0];

    let purchasedToday = 0;
    if (purchaseData) {
      const lastResetDate = new Date(purchaseData.lastReset).toISOString().split('T')[0];
      if (lastResetDate === today) {
        purchasedToday = purchaseData.count;
      }
    }

    return {
      itemId: item.itemId,
      name: item.name,
      dailyLimit: item.dailyLimit,
      purchasedToday,
      remaining: Math.max(0, item.dailyLimit - purchasedToday)
    };
  });

  return limits;
};
