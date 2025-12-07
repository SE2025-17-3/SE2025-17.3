// Backend - models/UserStreak.js
// Tracks user activity streaks

import mongoose from 'mongoose';

/**
 * Helper function to get yesterday's date key
 */
function getYesterdayKey(todayKey) {
    const [year, month, day] = todayKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}

const userStreakSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // Streak tracking
    currentStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    longestStreak: {
        type: Number,
        default: 0,
        min: 0
    },

    // Last activity date (YYYY-MM-DD format for easy comparison)
    lastActivityDate: {
        type: String,
        default: null
    },

    // Bonus multiplier based on streak
    // 0-2 days: 1.0x, 3-6 days: 1.5x, 7-29 days: 2.0x, 30+ days: 3.0x
    bonusMultiplier: {
        type: Number,
        default: 1.0
    }
}, {
    timestamps: true
});

// Static method to calculate bonus multiplier from streak
userStreakSchema.statics.calculateMultiplier = function (streak) {
    if (streak >= 30) return 3.0;
    if (streak >= 7) return 2.0;
    if (streak >= 3) return 1.5;
    return 1.0;
};

// Instance method to update streak
userStreakSchema.methods.updateForToday = function (todayKey) {
    const yesterday = getYesterdayKey(todayKey);

    if (this.lastActivityDate === todayKey) {
        // Already active today, no change
        return false;
    }

    if (this.lastActivityDate === yesterday) {
        // Consecutive day - increment streak
        this.currentStreak += 1;
    } else {
        // Streak broken - reset to 1
        this.currentStreak = 1;
    }

    // Update longest streak if needed
    if (this.currentStreak > this.longestStreak) {
        this.longestStreak = this.currentStreak;
    }

    // Update multiplier
    this.bonusMultiplier = this.constructor.calculateMultiplier(this.currentStreak);

    // Update last activity date
    this.lastActivityDate = todayKey;

    return true; // Streak was updated
};

// Index
userStreakSchema.index({ userId: 1 }, { unique: true });

const UserStreak = mongoose.model('UserStreak', userStreakSchema);

export default UserStreak;
