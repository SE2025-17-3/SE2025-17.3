// Backend - models/Badge.js
// Badge definitions for achievements

import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: '🏆'
    },
    rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary'],
        default: 'common'
    },
    requirement: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

badgeSchema.index({ key: 1 }, { unique: true });

const Badge = mongoose.model('Badge', badgeSchema);

export default Badge;
