// Backend - models/UserChallenge.js
// Tracks user progress on challenges

import mongoose from 'mongoose';

const userChallengeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challenge',
        required: true
    },

    // Progress tracking
    progress: {
        type: Number,
        default: 0,
        min: 0
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },

    // Reward tracking
    rewardClaimed: {
        type: Boolean,
        default: false
    },
    pointsEarned: {
        type: Number,
        default: 0
    },

    // Period tracking (for daily: "2025-12-07", for weekly: "2025-W49")
    periodKey: {
        type: String,
        required: true
    },

    // For tracking unique items (e.g., unique colors used)
    trackedItems: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

// Compound index to ensure one progress record per user per challenge per period
userChallengeSchema.index(
    { userId: 1, challengeId: 1, periodKey: 1 },
    { unique: true }
);

// Query optimization indexes
userChallengeSchema.index({ userId: 1, periodKey: 1 });
userChallengeSchema.index({ completed: 1, rewardClaimed: 1 });

const UserChallenge = mongoose.model('UserChallenge', userChallengeSchema);

export default UserChallenge;
