// D:\Code\SE2025-17.3\map-server\backend\migrations\20251120101450-add-pixelevent-and-team-models.cjs

module.exports = {
  /**
   * Migration: Add PixelEvent collection and Team model with indexes
   * - Creates pixelevents collection for leaderboard tracking
   * - Creates teams collection for team management
   * - Adds teamId field to users collection
   * - Creates necessary indexes for performance
   * 
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('🚀 Starting migration: add-pixelevent-and-team-models');

    // 1. Create teams collection with indexes
    console.log('📦 Creating teams collection...');
    const teamsExists = await db.listCollections({ name: 'teams' }).hasNext();
    if (!teamsExists) {
      await db.createCollection('teams');
      console.log('✅ Teams collection created');
    } else {
      console.log('ℹ️  Teams collection already exists');
    }

    // Create indexes for teams
    await db.collection('teams').createIndex({ name: 1 }, { unique: true });
    await db.collection('teams').createIndex({ createdBy: 1 });
    await db.collection('teams').createIndex({ createdAt: -1 });
    console.log('✅ Teams indexes created');

    // 2. Add teamId field to existing users (set to null by default)
    console.log('👥 Adding teamId field to users...');
    const usersWithoutTeamId = await db.collection('users').countDocuments({ teamId: { $exists: false } });
    if (usersWithoutTeamId > 0) {
      await db.collection('users').updateMany(
        { teamId: { $exists: false } },
        { $set: { teamId: null } }
      );
      console.log(`✅ Added teamId to ${usersWithoutTeamId} users`);
    } else {
      console.log('ℹ️  All users already have teamId field');
    }

    // Create index for teamId in users
    await db.collection('users').createIndex({ teamId: 1 });
    console.log('✅ Users teamId index created');

    // 3. Create pixelevents collection with indexes
    console.log('🎨 Creating pixelevents collection...');
    const pixelEventsExists = await db.listCollections({ name: 'pixelevents' }).hasNext();
    if (!pixelEventsExists) {
      await db.createCollection('pixelevents');
      console.log('✅ PixelEvents collection created');
    } else {
      console.log('ℹ️  PixelEvents collection already exists');
    }

    // Create indexes for pixelevents (critical for leaderboard performance)
    await db.collection('pixelevents').createIndex({ createdAt: -1 });
    await db.collection('pixelevents').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('pixelevents').createIndex({ teamId: 1, createdAt: -1 });
    console.log('✅ PixelEvents indexes created');

    console.log('🎉 Migration completed successfully!');
  },

  /**
   * Rollback migration
   * - Removes teamId from users
   * - Drops teams collection
   * - Drops pixelevents collection
   * 
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('⏪ Rolling back migration: add-pixelevent-and-team-models');

    // 1. Remove teamId from users
    console.log('👥 Removing teamId from users...');
    await db.collection('users').updateMany(
      {},
      { $unset: { teamId: "" } }
    );
    await db.collection('users').dropIndex('teamId_1').catch(() => console.log('Index already removed'));
    console.log('✅ TeamId removed from users');

    // 2. Drop teams collection
    console.log('📦 Dropping teams collection...');
    await db.collection('teams').drop().catch(() => console.log('Collection already removed'));
    console.log('✅ Teams collection dropped');

    // 3. Drop pixelevents collection
    console.log('🎨 Dropping pixelevents collection...');
    await db.collection('pixelevents').drop().catch(() => console.log('Collection already removed'));
    console.log('✅ PixelEvents collection dropped');

    console.log('🔄 Rollback completed!');
  }
};
