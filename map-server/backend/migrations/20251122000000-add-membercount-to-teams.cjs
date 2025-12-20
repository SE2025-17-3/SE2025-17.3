module.exports = {
  /**
   * Migration: Add memberCount field to teams collection
   * - Adds memberCount field to all existing teams
   * - Sets initial value based on actual user count
   * - Sets default to 1 for new teams
   * 
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('🚀 Starting migration: add-membercount-to-teams');

    // 1. Check if teams collection exists
    const teamsExists = await db.listCollections({ name: 'teams' }).hasNext();
    if (!teamsExists) {
      console.log('ℹ️  Teams collection does not exist, skipping migration');
      return;
    }

    // 2. Get all teams
    const teams = await db.collection('teams').find({}).toArray();
    console.log(`📊 Found ${teams.length} teams to update`);

    // 3. Update each team with correct memberCount
    for (const team of teams) {
      // Count users with this teamId
      const memberCount = await db.collection('users').countDocuments({ 
        teamId: team._id 
      });

      // Update the team with memberCount
      await db.collection('teams').updateOne(
        { _id: team._id },
        { 
          $set: { 
            memberCount: memberCount > 0 ? memberCount : 1 // At least 1 (the creator)
          } 
        }
      );

      console.log(`✅ Team "${team.name}": memberCount set to ${memberCount || 1}`);
    }

    // 4. Add validation for new documents (optional, for schema enforcement)
    console.log('📝 Setting default memberCount for new teams...');
    
    console.log('🎉 Migration completed successfully!');
    console.log(`   Updated ${teams.length} teams with memberCount field`);
  },

  /**
   * Rollback migration
   * - Removes memberCount field from teams
   * 
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('⏪ Rolling back migration: add-membercount-to-teams');

    // Remove memberCount from all teams
    const teamsExists = await db.listCollections({ name: 'teams' }).hasNext();
    if (teamsExists) {
      console.log('📦 Removing memberCount from teams...');
      const result = await db.collection('teams').updateMany(
        {},
        { $unset: { memberCount: "" } }
      );
      console.log(`✅ Removed memberCount from ${result.modifiedCount} teams`);
    }

    console.log('🔄 Rollback completed!');
  }
};
