// Backend - scripts/seedChallenges.js
// Seed initial challenge templates

import 'dotenv/config';
import mongoose from 'mongoose';
import Challenge from '../src/models/Challenge.js';
import Badge from '../src/models/Badge.js';

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
    }
];

const challenges = [
    // Daily challenges
    {
        key: 'daily_login',
        title: 'Daily Check-in',
        description: 'Log in today',
        type: 'daily',
        goal: { action: 'login', count: 1, conditions: {} },
        reward: { points: 5 },
        difficulty: 'easy',
        order: 0,
        icon: '📅'
    },
    {
        key: 'daily_10_pixels',
        title: 'Pixel Pioneer',
        description: 'Place 10 pixels today',
        type: 'daily',
        goal: { action: 'place_pixel', count: 10, conditions: {} },
        reward: { points: 15 },
        difficulty: 'easy',
        order: 1,
        icon: '🎨'
    },
    {
        key: 'daily_25_pixels',
        title: 'Steady Painter',
        description: 'Place 25 pixels today',
        type: 'daily',
        goal: { action: 'place_pixel', count: 25, conditions: {} },
        reward: { points: 25 },
        difficulty: 'medium',
        order: 2,
        icon: '🖌️'
    },
    {
        key: 'daily_50_pixels',
        title: 'Dedicated Artist',
        description: 'Place 50 pixels today',
        type: 'daily',
        goal: { action: 'place_pixel', count: 50, conditions: {} },
        reward: { points: 50 },
        difficulty: 'hard',
        order: 3,
        icon: '🎭'
    },
    {
        key: 'daily_5_colors',
        title: 'Color Explorer',
        description: 'Use 5 different colors today',
        type: 'daily',
        goal: { action: 'use_colors', count: 5, conditions: {} },
        reward: { points: 20 },
        difficulty: 'easy',
        order: 4,
        icon: '🔵'
    },
    {
        key: 'daily_all_colors',
        title: 'Rainbow Master',
        description: 'Use all 12 palette colors today',
        type: 'daily',
        goal: { action: 'use_colors', count: 12, conditions: {} },
        reward: { points: 40 },
        difficulty: 'hard',
        order: 5,
        icon: '🌈'
    }
];

async function seed() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Seed badges
        console.log('\n📛 Seeding badges...');
        for (const badge of badges) {
            await Badge.findOneAndUpdate(
                { key: badge.key },
                badge,
                { upsert: true, new: true }
            );
            console.log(`  ✅ Badge: ${badge.name}`);
        }

        // Seed challenges
        console.log('\n🎯 Seeding challenges...');
        for (const challenge of challenges) {
            await Challenge.findOneAndUpdate(
                { key: challenge.key },
                challenge,
                { upsert: true, new: true }
            );
            console.log(`  ✅ Challenge: ${challenge.title}`);
        }

        console.log('\n✅ Seeding completed successfully!');
        console.log(`   Badges: ${badges.length}`);
        console.log(`   Challenges: ${challenges.length}`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

seed();
