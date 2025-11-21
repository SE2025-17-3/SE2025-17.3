#!/bin/bash

# Clean up test team and user data

echo "🧹 Cleaning up test data..."

mongosh "mongodb+srv://admin:12345678aA@cluster0.w7yigwi.mongodb.net/pixel-canvas" --quiet --eval "
  // Delete the test team
  db.teams.deleteMany({ name: 'hehehe' });
  
  // Update the test user to remove teamId
  db.users.updateMany({ username: 'ductran2511' }, { \$unset: { teamId: '' } });
  
  print('✅ Test data cleaned up');
"

echo ""
echo "📊 Current state:"
./view-db.sh
