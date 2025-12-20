// backend/scripts/seedChallenges.js
// Seed initial challenge templates

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Challenge from '../src/models/Challenge.js';
import Badge from '../src/models/Badge.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

const badges = [
    {
        key: 'week_warrior',
        name: 'Week Warrior',
        description: 'Complete challenges 7 days in a row',
        icon: '🔥',
        rarity: 'rare',
        requirement: '7-day streak'
    },
    {
        key: 'month_master',
        name: 'Month Master',
        description: 'Complete challenges 30 days in a row',
        icon: '👑',
        rarity: 'legendary',
        requirement: '30-day streak'
    },
    {
        key: 'rainbow_master',
        name: 'Rainbow Master',
        description: 'Use all 12 colors in one day',
        icon: '🌈',
        rarity: 'epic',
        requirement: 'Use all palette colors'
    },
    {
        key: 'pixel_artist',
        name: 'Pixel Artist',
        description: 'Place 1000 pixels',
        icon: '🎨',
        rarity: 'epic',
        requirement: 'Place 1000 pixels total'
    }
];

const challenges = [
    // Daily challenges
    {
        key: 'daily_pixels_10',
        title: 'Daily Painter',
        description: 'Place 10 pixels today',
        type: 'daily',
        goal: { action: 'place_pixels', count: 10, conditions: {} },
        reward: { points: 10 },
        difficulty: 'easy',
        order: 0,
        icon: '🎨'
    },
    {
        key: 'daily_pixels_25',
        title: 'Dedicated Artist',
        description: 'Place 25 pixels today',
        type: 'daily',
        goal: { action: 'place_pixels', count: 25, conditions: {} },
        reward: { points: 25 },
        difficulty: 'medium',
        order: 1,
        icon: '🖌️'
    },
    {
        key: 'daily_pixels_50',
        title: 'Master Painter',
        description: 'Place 50 pixels today',
        type: 'daily',
        goal: { action: 'place_pixels', count: 50, conditions: {} },
        reward: { points: 50 },
        difficulty: 'hard',
        order: 2,
        icon: '🏆'
    }
];

async function seedChallenges() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Badge.deleteMany({});
        await Challenge.deleteMany({});
        console.log('🗑️  Cleared existing challenges and badges');

        // Insert badges
        const insertedBadges = await Badge.insertMany(badges);
        console.log(`✅ Inserted ${insertedBadges.length} badges`);

        // Insert challenges
        const insertedChallenges = await Challenge.insertMany(challenges);
        console.log(`✅ Inserted ${insertedChallenges.length} challenges`);

        console.log('🎉 Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding challenges:', error);
        process.exit(1);
    }
}

seedChallenges();
