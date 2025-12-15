#!/bin/bash

# Script to view MongoDB collections

echo "🔍 Connecting to MongoDB Atlas - pixel-canvas database..."
echo ""

# Show all collections
echo "📊 Collections:"
mongosh "mongodb+srv://admin:12345678aA@cluster0.w7yigwi.mongodb.net/pixel-canvas" --quiet --eval "db.getCollectionNames()"

echo ""
echo "� Document counts:"
mongosh "mongodb+srv://admin:12345678aA@cluster0.w7yigwi.mongodb.net/pixel-canvas" --quiet --eval "
  print('👥 Users: ' + db.users.countDocuments());
  print('🎨 Teams: ' + db.teams.countDocuments());
  print('🎯 Pixels: ' + db.pixels.countDocuments());
  print('📊 PixelEvents: ' + db.pixelevents.countDocuments());
  print('🔐 Sessions: ' + db.sessions.countDocuments());
"

echo ""
echo "📝 Recent teams:"
mongosh "mongodb+srv://admin:12345678aA@cluster0.w7yigwi.mongodb.net/pixel-canvas" --quiet --eval "db.teams.find().limit(5).forEach(printjson)"

echo ""
echo "👤 Recent users:"
mongosh "mongodb+srv://admin:12345678aA@cluster0.w7yigwi.mongodb.net/pixel-canvas" --quiet --eval "db.users.find().limit(5).forEach(printjson)"
