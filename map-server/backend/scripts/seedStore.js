// backend/scripts/seedStore.js
import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import StoreItem from '../src/models/StoreItem.js';

dotenv.config();

const storeItems = [
  // Energy Boost Items (1 Droplet = 30 charges)
  {
    itemId: 'energy_boost_1',
    name: '1 Droplet Energy',
    description: 'Instantly gain 30 paint charges',
    category: 'energy_boost',
    price: 1,
    effect: {
      type: 'instant_energy',
      value: 1 // 1 droplet = 30 charges (calculated in service)
    },
    icon: '⚡',
    isActive: true,
    dailyLimit: 10,
    sortOrder: 1
  },
  {
    itemId: 'energy_boost_5',
    name: '5 Droplets Energy',
    description: 'Instantly gain 150 paint charges',
    category: 'energy_boost',
    price: 5,
    effect: {
      type: 'instant_energy',
      value: 5 // 5 droplets = 150 charges
    },
    icon: '⚡⚡',
    isActive: true,
    dailyLimit: 5,
    sortOrder: 2
  },
  {
    itemId: 'energy_boost_10',
    name: '10 Droplets Energy',
    description: 'Instantly gain 300 paint charges',
    category: 'energy_boost',
    price: 10,
    effect: {
      type: 'instant_energy',
      value: 10 // 10 droplets = 300 charges
    },
    icon: '⚡⚡⚡',
    isActive: true,
    dailyLimit: 3,
    sortOrder: 3
  },

  // Max Capacity Upgrades (1 Droplet = +5 max capacity)
  {
    itemId: 'capacity_upgrade_1',
    name: '+5 Max Capacity',
    description: 'Permanently increase your max paint charges by 5',
    category: 'capacity_upgrade',
    price: 1,
    effect: {
      type: 'max_capacity',
      value: 1 // 1 droplet = +5 capacity
    },
    icon: '📦',
    isActive: true,
    dailyLimit: null, // Unlimited
    sortOrder: 10
  },
  {
    itemId: 'capacity_upgrade_10',
    name: '+50 Max Capacity',
    description: 'Permanently increase your max paint charges by 50',
    category: 'capacity_upgrade',
    price: 10,
    effect: {
      type: 'max_capacity',
      value: 10 // 10 droplets = +50 capacity
    },
    icon: '📦📦',
    isActive: true,
    dailyLimit: null,
    sortOrder: 11
  },
  {
    itemId: 'capacity_upgrade_50',
    name: '+250 Max Capacity',
    description: 'Permanently increase your max paint charges by 250',
    category: 'capacity_upgrade',
    price: 50,
    effect: {
      type: 'max_capacity',
      value: 50 // 50 droplets = +250 capacity
    },
    icon: '📦📦📦',
    isActive: true,
    dailyLimit: null,
    sortOrder: 12
  },
  {
    itemId: 'capacity_upgrade_100',
    name: '+500 Max Capacity',
    description: 'Permanently increase your max paint charges by 500',
    category: 'capacity_upgrade',
    price: 100,
    effect: {
      type: 'max_capacity',
      value: 100 // 100 droplets = +500 capacity
    },
    icon: '🎁',
    isActive: true,
    dailyLimit: null,
    sortOrder: 13
  }
];

async function seedStore() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Clear existing store items
    await StoreItem.deleteMany({});
    console.log('🗑️  Cleared existing store items');

    // Insert new items
    await StoreItem.insertMany(storeItems);
    console.log(`✅ Inserted ${storeItems.length} store items`);

    console.log('\n📊 Store Item Summary:');
    console.log('  Energy Boosts: 3 items');
    console.log('  Capacity Upgrades: 4 items');
    console.log('\n💧 Droplet Pricing:');
    console.log('  1 Droplet = 30 paint charges (instant energy)');
    console.log('  1 Droplet = +5 max capacity (permanent)');

    console.log('\n🎉 Store seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding store:', error);
    process.exit(1);
  }
}

seedStore();
