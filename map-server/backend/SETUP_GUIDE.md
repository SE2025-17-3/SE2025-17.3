# Setup Guide - Outbox Pattern Implementation

## 🚀 Quick Start

### **Prerequisites**

1. **Node.js** 18+ installed
2. **MongoDB** 4.0+ with replica set enabled
3. **Redis** 5.0+ installed and running

### **1. Install Dependencies**

```bash
cd /home/duy-hieu/project/cnpm/map-server/backend
npm install
```

### **2. Setup MongoDB Replica Set**

**For development (single-node replica set):**

```bash
# Start MongoDB with replica set
mongod --replSet rs0 --dbpath /data/db --port 27017

# In another terminal, initialize replica set
mongosh
> rs.initiate()
> exit
```

**Verify replica set:**
```bash
mongosh
> rs.status()
```

### **3. Start Redis**

```bash
# Start Redis server
redis-server

# Verify Redis is running
redis-cli PING
# Should return: PONG
```

### **4. Configure Environment**

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MongoDB (note the replicaSet parameter)
MONGO_URI=mongodb://localhost:27017/pixel-canvas?replicaSet=rs0

# Session
SESSION_SECRET=change-this-to-random-secret-in-production
SESSION_NAME=connect.sid

# JWT
JWT_SECRET=change-this-to-random-jwt-secret

# Redis
REDIS_URL=redis://localhost:6379
```

### **5. Start the Server**

```bash
npm run dev
# or
node server.js
```

You should see:

```
✅ Connected to MongoDB
🔗 Redis Publisher connected
🔗 Redis Subscriber connected
🔗 Redis General Client connected
✅ Consumer group "pixel-broadcasters" created
🚀 Outbox publisher worker started
🚀 Stream consumer started (consumer-12345)
✅ All workers started successfully
✅ Server đang chạy trên port 4000
📡 Frontend URL: http://localhost:5173
🔧 Environment: development
```

## 🧪 Testing the Implementation

### **Test 1: Place a Pixel**

```bash
curl -X POST http://localhost:4000/api/pixels \
  -H "Content-Type: application/json" \
  -d '{"gx": 100, "gy": 200, "color": "#FF0000"}'
```

**Expected flow:**
1. Server logs: `✅ Pixel saved & event queued: (100, 200) #FF0000`
2. Server logs: `📡 Published to Redis Stream: ...`
3. Server logs: `📡 Broadcasted pixel via Socket.IO: (100, 200) #FF0000`

### **Test 2: Check Outbox**

```bash
mongosh pixel-canvas
> db.outboxes.find().pretty()
```

You should see events with `published: true` and `publishedAt` timestamp.

### **Test 3: Check Redis Stream**

```bash
redis-cli XLEN pixels:events
redis-cli XRANGE pixels:events - + COUNT 10
```

### **Test 4: Monitor Consumer Group**

```bash
redis-cli XINFO GROUPS pixels:events
redis-cli XPENDING pixels:events pixel-broadcasters
```

## 🔍 Verification Checklist

- [ ] MongoDB replica set initialized and running
- [ ] Redis server running and accessible
- [ ] All Redis clients connected (Publisher, Subscriber, General)
- [ ] Outbox publisher worker started
- [ ] Stream consumer started and consumer group created
- [ ] Can place pixel via HTTP POST
- [ ] Event appears in outbox collection
- [ ] Event gets published to Redis Stream
- [ ] Event gets consumed and broadcasted via Socket.IO
- [ ] Event marked as published in outbox

## 🐛 Common Issues

### **Issue: "Transaction not supported"**

**Cause:** MongoDB not running as replica set

**Solution:**
```bash
# Stop MongoDB
pkill mongod

# Start with replica set
mongod --replSet rs0 --dbpath /data/db

# Initialize (first time only)
mongosh
> rs.initiate()
```

### **Issue: "Redis connection refused"**

**Cause:** Redis not running

**Solution:**
```bash
# Start Redis
redis-server

# Or install Redis
# Ubuntu/Debian:
sudo apt install redis-server

# macOS:
brew install redis
brew services start redis
```

### **Issue: "Consumer group already exists"**

This is **not an error** - it's expected! The system will log:
```
ℹ️ Consumer group "pixel-broadcasters" already exists
```

### **Issue: Events not being broadcast**

**Debug steps:**

1. Check outbox backlog:
```javascript
mongosh pixel-canvas
> db.outboxes.countDocuments({ published: false })
```

2. Check worker logs for errors

3. Check Redis connection:
```bash
redis-cli PING
```

4. Restart the server

## 📊 Monitoring in Production

### **Key Metrics**

1. **Outbox backlog size**
   ```javascript
   db.outboxes.countDocuments({ published: false })
   ```
   Alert if > 1000

2. **Redis stream length**
   ```bash
   redis-cli XLEN pixels:events
   ```
   Alert if > 10000

3. **Consumer lag**
   ```bash
   redis-cli XPENDING pixels:events pixel-broadcasters
   ```
   Alert if pending > 100

4. **Worker health**
   - Check logs for worker start/stop
   - Monitor publish rate (events/sec)

### **Health Check Endpoint**

You can add this to your API:

```javascript
app.get('/api/health', async (req, res) => {
  const backlog = await Outbox.countDocuments({ published: false });
  const streamLength = await redis.xlen('pixels:events');
  
  res.json({
    status: 'ok',
    outbox: {
      unpublished: backlog,
    },
    redis: {
      streamLength,
    },
    workers: {
      publisher: outboxPublisher.getStatus(),
      consumer: streamConsumer.getStatus(),
    },
  });
});
```

## 🔧 Performance Tuning

### **For Higher Throughput**

```javascript
// Increase batch sizes
const outboxPublisher = getOutboxPublisher({
  pollInterval: 50,   // Poll faster
  batchSize: 100,     // Process more at once
});

const streamConsumer = new StreamConsumer(io, {
  blockTime: 500,     // Lower block time
  batchSize: 20,      // Process more at once
});
```

### **For Lower Latency**

```javascript
// Optimize for speed
const outboxPublisher = getOutboxPublisher({
  pollInterval: 10,   // Poll very frequently
  batchSize: 10,      // Smaller batches
});
```

### **For Lower CPU Usage**

```javascript
// Optimize for efficiency
const outboxPublisher = getOutboxPublisher({
  pollInterval: 500,  // Poll less frequently
  batchSize: 50,
});
```

## 📝 Next Steps

1. **Add monitoring** - Implement health check endpoint
2. **Add rate limiting** - Prevent pixel spam
3. **Add caching** - Cache chunks in Redis
4. **Add alerting** - Alert on high backlog or errors
5. **Load testing** - Test with many concurrent users
6. **Documentation** - Document your specific business rules

## 🆘 Getting Help

If you encounter issues:

1. Check logs in console
2. Verify MongoDB and Redis are running
3. Check environment variables in `.env`
4. Review `OUTBOX_PATTERN.md` for architecture details
5. Check MongoDB replica set status: `rs.status()`
6. Check Redis connection: `redis-cli PING`

## ✅ You're Ready!

Your pixel canvas now has:
- ✅ **ACID transactions** - Guaranteed consistency
- ✅ **Reliable event delivery** - No lost pixels
- ✅ **Horizontal scalability** - Can add more servers
- ✅ **Graceful degradation** - Works even if Redis is temporarily down
- ✅ **At-least-once delivery** - Events will be delivered (maybe twice, but that's OK)
- ✅ **Production-ready** - Proper error handling and shutdown

Enjoy your robust pixel canvas! 🎨

