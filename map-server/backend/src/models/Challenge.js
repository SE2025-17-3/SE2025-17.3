// Backend - models/Challenge.js
// Challenge template definitions

import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
    // Unique identifier for the challenge
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    // Display info
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },

    // Challenge type
    type: {
        type: String,
        enum: ['daily', 'weekly', 'event'],
        default: 'daily'
    },

    // Goal definition
    goal: {
        action: {
            type: String,
            required: true,
            enum: ['place_pixel', 'use_colors', 'login', 'join_team']
        },
        count: {
            type: Number,
            required: true,
            min: 1
        },
        // Optional conditions (e.g., specific colors, regions)
        conditions: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },

    // Reward
    reward: {
        points: {
            type: Number,
            required: true,
            min: 0
        },
        badgeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Badge',
            default: null
        }
    },

    // Status and scheduling
    isActive: {
        type: Boolean,
        default: true
    },
    startsAt: {
        type: Date,
        default: null
    },
    endsAt: {
        type: Date,
        default: null
    },

    // Metadata
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    order: {
        type: Number,
        default: 0
    },
    icon: {
        type: String,
        default: '🎯'
    }
}, {
    timestamps: true
});

// Indexes
challengeSchema.index({ type: 1, isActive: 1 });
challengeSchema.index({ key: 1 }, { unique: true });

const Challenge = mongoose.model('Challenge', challengeSchema);

export default Challenge;
