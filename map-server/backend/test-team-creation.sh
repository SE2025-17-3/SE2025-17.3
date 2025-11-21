#!/bin/bash

# Test creating a team and checking the response

echo "🧪 Testing team creation API..."
echo ""

# Get session cookie first (login)
echo "1. Logging in..."
COOKIE=$(curl -s -c - -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hrhe@gmail.com","password":"123456"}' | grep connect.sid | awk '{print $7}')

if [ -z "$COOKIE" ]; then
  echo "❌ Login failed - no cookie received"
  exit 1
fi

echo "✅ Logged in, cookie: $COOKIE"
echo ""

# Create a team
echo "2. Creating team 'TestTeam'..."
RESPONSE=$(curl -s -X POST http://localhost:4000/api/teams \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=$COOKIE" \
  -d '{"name":"TestTeam"}')

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Get current user info
echo "3. Getting current user info..."
USER_RESPONSE=$(curl -s -X GET http://localhost:4000/api/users/me \
  -H "Cookie: connect.sid=$COOKIE")

echo "User info:"
echo "$USER_RESPONSE" | jq '.'
echo ""

# Get team details
TEAM_ID=$(echo "$RESPONSE" | jq -r '.team._id')
if [ "$TEAM_ID" != "null" ] && [ -n "$TEAM_ID" ]; then
  echo "4. Getting team details for ID: $TEAM_ID..."
  TEAM_RESPONSE=$(curl -s -X GET "http://localhost:4000/api/teams/$TEAM_ID" \
    -H "Cookie: connect.sid=$COOKIE")
  
  echo "Team details:"
  echo "$TEAM_RESPONSE" | jq '.'
fi
