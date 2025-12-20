#!/bin/bash

# Test leaderboard API endpoint

echo "🧪 Testing leaderboard API..."
echo ""

echo "1. GET /api/leaderboard (combined - all time):"
curl -s http://localhost:4000/api/leaderboard | jq '.'
echo ""

echo "2. GET /api/leaderboard?period=today:"
curl -s "http://localhost:4000/api/leaderboard?period=today" | jq '.'
echo ""

echo "3. GET /api/leaderboard/players:"
curl -s http://localhost:4000/api/leaderboard/players | jq '.'
echo ""

echo "4. GET /api/leaderboard/teams:"
curl -s http://localhost:4000/api/leaderboard/teams | jq '.'
