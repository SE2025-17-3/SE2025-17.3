module.exports = {
  /**
   * Add userId field to existing pixels and create index
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Adding userId field to existing pixels...');
    
    // Add userId field to all existing pixels (set to null for anonymous)
    const result = await db.collection('pixels').updateMany(
      { userId: { $exists: false } },
      { $set: { userId: null } }
    );
    
    console.log(`Updated ${result.modifiedCount} pixels with userId field`);
    
    // Create index on userId for better query performance
    await db.collection('pixels').createIndex({ userId: 1 });
    console.log('Created index on userId field');
    
    // Create compound index on gx, gy if not exists (for unique constraint)
    await db.collection('pixels').createIndex({ gx: 1, gy: 1 }, { unique: true });
    console.log('Ensured unique compound index on (gx, gy)');
    
    // Create index on updatedAt for time-based queries
    await db.collection('pixels').createIndex({ updatedAt: -1 });
    console.log('Created index on updatedAt field');
  },

  /**
   * Remove userId field from pixels and drop related indexes
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Removing userId field from pixels...');
    
    // Remove userId field from all pixels
    const result = await db.collection('pixels').updateMany(
      { userId: { $exists: true } },
      { $unset: { userId: '' } }
    );
    
    console.log(`Removed userId field from ${result.modifiedCount} pixels`);
    
    // Drop the userId index
    try {
      await db.collection('pixels').dropIndex({ userId: 1 });
      console.log('Dropped index on userId field');
    } catch (error) {
      console.log('Index on userId may not exist, skipping...');
    }
  }
};
