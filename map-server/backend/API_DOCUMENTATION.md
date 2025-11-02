# 🎨 Map Server API Documentation

## 📊 Statistics & Leaderboard Endpoints

### **Top Players**

#### Get Top 50 Players (All Time)
```http
GET /api/stats/top-players
GET /api/stats/top-players?limit=50
GET /api/leaderboard/players?limit=50
```

#### Get Top Players by Period
```http
GET /api/stats/top-players?period=today&limit=50
GET /api/stats/top-players?period=week&limit=50
GET /api/stats/top-players?period=month&limit=50
GET /api/stats/top-players?period=all&limit=50
GET /api/leaderboard/players?period=today&limit=50
```

**Query Parameters:**
- `period` (optional): `today`, `week`, `month`, `all` (default: `all`)
- `limit` (optional): Number of players (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "today",
    "startDate": "2025-11-02T00:00:00.000Z",
    "players": [
      {
        "rank": 1,
        "userId": "507f1f77bcf86cd799439011",
        "username": "artist123",
        "email": "artist@example.com",
        "teamId": "507f1f77bcf86cd799439012",
        "teamName": "Dream Team",
        "pixelCount": 1250,
        "joinedAt": "2025-11-01T10:00:00.000Z"
      }
      // ... 49 more
    ],
    "count": 50
  }
}
```

---

### **Top Teams**

#### Get Top 50 Teams (All Time)
```http
GET /api/stats/top-teams
GET /api/stats/top-teams?limit=50
GET /api/leaderboard/teams?limit=50
```

#### Get Top Teams by Period
```http
GET /api/stats/top-teams?period=today&limit=50
GET /api/stats/top-teams?period=week&limit=50
GET /api/stats/top-teams?period=month&limit=50
GET /api/stats/top-teams?period=all&limit=50
GET /api/leaderboard/teams?period=today&limit=50
```

**Query Parameters:**
- `period` (optional): `today`, `week`, `month`, `all` (default: `all`)
- `limit` (optional): Number of teams (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "week",
    "startDate": "2025-10-26T09:00:00.000Z",
    "teams": [
      {
        "rank": 1,
        "teamId": "507f1f77bcf86cd799439012",
        "teamName": "Dream Team",
        "memberCount": 4,
        "memberNames": ["user1", "user2", "user3", "user4"],
        "pixelCount": 5000,
        "avgPixelsPerMember": 1250,
        "createdBy": "507f1f77bcf86cd799439011",
        "createdAt": "2025-10-15T10:00:00.000Z"
      }
      // ... 49 more
    ],
    "count": 50
  }
}
```

---

### **Combined Leaderboard**

#### Get Top 10 Players & Teams
```http
GET /api/stats/leaderboard
GET /api/stats/leaderboard?period=today
GET /api/stats/leaderboard?period=week&limit=20
GET /api/leaderboard/leaderboard?period=week&limit=20
```

**Query Parameters:**
- `period` (optional): `today`, `week`, `month`, `all` (default: `all`)
- `limit` (optional): Number per category (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "today",
    "startDate": "2025-11-02T00:00:00.000Z",
    "topPlayers": [
      {
        "rank": 1,
        "userId": "...",
        "username": "artist123",
        "teamName": "Dream Team",
        "pixelCount": 150
      }
      // ... 9 more
    ],
    "topTeams": [
      {
        "rank": 1,
        "teamId": "...",
        "teamName": "Dream Team",
        "memberCount": 4,
        "memberNames": ["user1", "user2", "user3", "user4"],
        "pixelCount": 500,
        "avgPixelsPerMember": 125
      }
      // ... 9 more
    ]
  }
}
```

---

### **Overall Statistics**

#### Get Overall Canvas Stats
```http
GET /api/stats/overall
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totals": {
      "pixels": 50000,
      "users": 250,
      "teams": 50,
      "pixelsWithUsers": 45000,
      "anonymousPixels": 5000
    },
    "activity": {
      "today": 1500,
      "thisWeek": 8000,
      "thisMonth": 25000
    },
    "topColors": [
      {
        "color": "#FF5733",
        "count": 5000,
        "percentage": "10.00"
      }
      // ... 4 more
    ]
  }
}
```

---

### **User Statistics**

#### Get Current User's Stats (Requires Auth)
```http
GET /api/stats/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "artist123",
      "email": "artist@example.com",
      "team": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Dream Team"
      },
      "createdAt": "2025-11-01T10:00:00.000Z"
    },
    "stats": {
      "total": 1250,
      "today": 50,
      "thisWeek": 300,
      "thisMonth": 800,
      "rank": 3,
      "totalPlayers": 250,
      "latestPixel": {
        "gx": 100,
        "gy": 200,
        "color": "#FF5733",
        "updatedAt": "2025-11-02T09:30:00.000Z"
      }
    }
  }
}
```

#### Get Specific User's Stats
```http
GET /api/stats/user/:userId
```

**Response:** Same as above

---

### **Team Statistics**

#### Get Specific Team's Stats
```http
GET /api/stats/team/:teamId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Dream Team",
      "createdBy": "507f1f77bcf86cd799439011",
      "createdAt": "2025-10-15T10:00:00.000Z",
      "memberCount": 4
    },
    "stats": {
      "total": 5000,
      "today": 200,
      "thisWeek": 1200,
      "thisMonth": 3500,
      "rank": 1,
      "totalTeams": 50,
      "avgPixelsPerMember": 1250
    },
    "memberStats": [
      {
        "userId": "...",
        "username": "user1",
        "pixelCount": 1500
      },
      {
        "userId": "...",
        "username": "user2",
        "pixelCount": 1300
      }
      // ... 2 more
    ]
  }
}
```

---

## 👥 Team Management Endpoints

### Create Team
```http
POST /api/teams
Content-Type: application/json
Authorization: Required (via session)

{
  "name": "Dream Team",
  "description": "Best pixel artists" // optional
}
```

### Get All Teams
```http
GET /api/teams
```

### Get My Team
```http
GET /api/teams/my-team
Authorization: Required
```

### Get Team by ID
```http
GET /api/teams/:teamId
```

### Join Team
```http
POST /api/teams/:teamId/join
Authorization: Required
```

### Leave Team
```http
POST /api/teams/leave
Authorization: Required
```

### Update Team
```http
PUT /api/teams/:teamId
Content-Type: application/json
Authorization: Required (Team Creator only)

{
  "name": "New Team Name", // optional
  "description": "Updated description" // optional
}
```

### Delete Team
```http
DELETE /api/teams/:teamId
Authorization: Required (Team Creator only)
```

---

## 📈 Usage Examples

### Frontend Example - Display Today's Leaderboard

```javascript
// Fetch today's top 10 players and teams
const response = await fetch('http://localhost:4000/api/stats/leaderboard?period=today&limit=10', {
  credentials: 'include'
});

const { data } = await response.json();

console.log('Top Players Today:', data.topPlayers);
console.log('Top Teams Today:', data.topTeams);
```

### Frontend Example - Display Top 50 All-Time Players

```javascript
const response = await fetch('http://localhost:4000/api/stats/top-players?limit=50', {
  credentials: 'include'
});

const { data } = await response.json();

console.log('Top 50 Players (All Time):', data.players);
```

### Frontend Example - Display This Week's Top Teams

```javascript
const response = await fetch('http://localhost:4000/api/stats/top-teams?period=week&limit=50', {
  credentials: 'include'
});

const { data } = await response.json();

console.log('Top 50 Teams This Week:', data.teams);
```

---

## 🔄 Real-time Updates

Subscribe to Socket.IO events for real-time leaderboard updates:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  withCredentials: true
});

// Request initial leaderboard
socket.emit('request:top-drawers', { limit: 10 });

// Listen for updates
socket.on('update:top-drawers', (topDrawers) => {
  console.log('Updated top drawers:', topDrawers);
  // Update your UI
});
```

---

## 📊 Period Options

| Period | Description | Date Range |
|--------|-------------|------------|
| `today` | Current day | 00:00 today → now |
| `week` | Last 7 days | 7 days ago → now |
| `month` | Last 30 days | 30 days ago → now |
| `all` | All time | No filter |

---

## ✅ Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 500 | Server Error |

---

## 🎯 Summary

**Statistics Endpoints:**
- ✅ Top 50 players (today, week, month, all time)
- ✅ Top 50 teams (today, week, month, all time)
- ✅ Combined leaderboard
- ✅ Overall statistics
- ✅ Individual user stats
- ✅ Individual team stats

**Team Endpoints:**
- ✅ Create/Read/Update/Delete teams
- ✅ Join/Leave teams
- ✅ Max 4 members per team
- ✅ Team creator permissions

All endpoints are ready to use! 🚀
