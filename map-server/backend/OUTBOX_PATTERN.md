# Outbox Pattern Implementation

## 📋 Overview

This application implements the **Outbox Pattern** to ensure reliable event delivery between MongoDB and Redis Streams, guaranteeing that pixel placement events are delivered to all connected clients.

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ HTTP POST /api/pixels
       ↓
┌──────────────────────────────────────────────────────┐
│              Express API Server                       │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │    MongoDB Transaction (ACID)                │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  │    │
│  │  │  Pixel          │  │  Outbox         │  │    │
│  │  │  Collection     │  │  Collection     │  │    │
│  │  │  (gx, gy, color)│  │  (event, data)  │  │    │
│  │  └─────────────────┘  └─────────────────┘  │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
       │
       │ (Transaction committed - both writes succeed or both fail)
       ↓
┌──────────────────────────────────────────────────────┐
│       Outbox Publisher Worker (Background)            │
│       • Polls outbox table every 100ms                │
│       • Publishes unpublished events to Redis Stream  │
│       • Marks events as published                     │
│       • Retries on failure                            │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
              ┌─────────────┐
              │ Redis Stream │
              │ (Event Log)  │
              └──────┬───────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────┐
│    Stream Consumer Worker (Background)                │
│    • Consumes events from Redis Stream                │
│    • Uses consumer groups for reliability             │
│    • Broadcasts to Socket.IO                          │
│    • Acknowledges processed messages                  │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
              ┌─────────────┐
              │  Socket.IO  │
              │  Broadcast  │
              └──────┬───────┘
                     │
                     ↓
          ┌──────────┴──────────┐
          ↓                     ↓
    ┌──────────┐          ┌──────────┐
    │ Client A │          │ Client B │
    │ (Update) │          │ (Update) │
    └──────────┘          └──────────┘
```

## 🔐 Guarantees

### 1. **Atomicity**
- Pixel save and event creation happen in a **single MongoDB transaction**
- Either both succeed or both fail (no partial state)
- If transaction fails, client receives error and can retry

### 2. **At-Least-Once Delivery**
- Events in outbox will **eventually** be published
- If Redis is down, events queue up in outbox
- When Redis comes back, worker publishes backlog
- Consumer groups ensure message redelivery on failure

### 3. **Durability**
- MongoDB persists pixel data
- Outbox table persists events until published
- Redis Stream persists events (if persistence enabled)
- Published events kept for 7 days (configurable TTL)

### 4. **Idempotency**
- Same pixel update applied multiple times = same result
- Clients use `Map.set(key, value)` which is idempotent
- Safe even if event delivered twice

## 📂 File Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── redis.js           # Redis client configuration
│   ├── models/
│   │   ├── Pixel.js           # Pixel schema
│   │   └── Outbox.js          # Outbox schema
│   ├── controllers/
│   │   └── pixelController.js # Pixel placement logic (with transaction)
│   ├── routes/
│   │   └── pixelRoutes.js     # API routes
│   └── workers/
│       ├── outboxPublisher.js # Polls outbox → publishes to Redis
│       └── streamConsumer.js  # Consumes Redis → broadcasts Socket.IO
├── server.js                  # Main server with workers
└── package.json
```

## 🔄 Data Flow

### **Write Path (Placing a Pixel)**

1. **Client Request**
   ```javascript
   POST /api/pixels
   Body: { gx: 100, gy: 200, color: "#FF0000" }
   ```

2. **MongoDB Transaction** (pixelController.js)
   ```javascript
   const session = await mongoose.startSession();
   await session.withTransaction(async () => {
     // Save pixel
     await Pixel.findOneAndUpdate({ gx, gy }, { color }, { session });
     
     // Save event to outbox
     await Outbox.create([{
       eventType: 'pixel_placed',
       payload: { gx, gy, color },
       published: false
     }], { session });
   });
   ```

3. **Outbox Publisher** (outboxPublisher.js)
   ```javascript
   // Every 100ms:
   const events = await Outbox.find({ published: false });
   for (const event of events) {
     await redis.xadd('pixels:events', '*', ...event.payload);
     await Outbox.markAsPublished(event._id);
   }
   ```

4. **Stream Consumer** (streamConsumer.js)
   ```javascript
   const messages = await redis.xreadgroup(
     'GROUP', 'pixel-broadcasters', 'consumer-1',
     'STREAMS', 'pixels:events', '>'
   );
   
   for (const [id, data] of messages) {
     io.emit('pixel_placed', data);
     await redis.xack('pixels:events', 'pixel-broadcasters', id);
   }
   ```

5. **Client Update**
   ```javascript
   socket.on('pixel_placed', (data) => {
     pixelMap.set(`${data.gx}:${data.gy}`, data.color);
     redrawCanvas();
   });
   ```

## ⚙️ Configuration

### **Environment Variables**

```bash
# MongoDB (must support transactions - replica set or 4.0+)
MONGO_URI=mongodb://localhost:27017/pixel-canvas?replicaSet=rs0

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=4000
FRONTEND_URL=http://localhost:5173
```

### **MongoDB Requirements**

MongoDB transactions require:
- MongoDB 4.0+ (for replica set transactions)
- MongoDB 4.2+ (for sharded cluster transactions)
- **Replica set** enabled (even for single-node development)

**Setup replica set for development:**
```bash
# Start MongoDB with replica set
mongod --replSet rs0 --dbpath /data/db

# Initialize replica set (in mongo shell)
rs.initiate()
```

### **Redis Requirements**

Redis Streams available in:
- Redis 5.0+

**Optional persistence configuration** (redis.conf):
```
appendonly yes
appendfsync everysec
```

## 🛠️ Worker Configuration

### **Outbox Publisher**
```javascript
const outboxPublisher = getOutboxPublisher({
  pollInterval: 100,  // Poll every 100ms
  batchSize: 50,      // Process 50 events at a time
});
```

**Tuning:**
- Lower `pollInterval` = lower latency, higher CPU usage
- Higher `batchSize` = better throughput, higher memory usage

### **Stream Consumer**
```javascript
const streamConsumer = new StreamConsumer(io, {
  consumerName: `consumer-${process.pid}`,
  blockTime: 1000,   // Block for 1 second waiting for messages
  batchSize: 10,     // Process 10 messages at a time
});
```

**Tuning:**
- Lower `blockTime` = more responsive, more CPU usage
- Higher `batchSize` = better throughput, higher latency

## 📊 Monitoring

### **Check Outbox Backlog**
```javascript
const backlog = await Outbox.countDocuments({ published: false });
console.log(`Outbox backlog: ${backlog} events`);
```

### **Check Redis Stream Length**
```bash
redis-cli XLEN pixels:events
```

### **Check Consumer Group Status**
```bash
redis-cli XINFO GROUPS pixels:events
redis-cli XPENDING pixels:events pixel-broadcasters
```

### **Key Metrics to Track**
- Outbox backlog size (should be near 0)
- Outbox publish rate (events/second)
- Redis stream length
- Consumer lag (pending messages)
- Transaction failure rate

## 🐛 Troubleshooting

### **Events Not Being Broadcast**

1. **Check outbox backlog**
   ```javascript
   await Outbox.find({ published: false }).limit(10);
   ```

2. **Check Redis connection**
   ```bash
   redis-cli PING
   ```

3. **Check worker status**
   ```javascript
   console.log(outboxPublisher.getStatus());
   console.log(streamConsumer.getStatus());
   ```

### **High Outbox Backlog**

Possible causes:
- Redis is down or slow
- Outbox publisher worker crashed
- Publishing rate < incoming rate

Solutions:
- Scale horizontally (multiple publisher workers)
- Increase batch size
- Decrease poll interval
- Check Redis performance

### **Duplicate Events**

This is **expected behavior** (at-least-once delivery). Ensure:
- Client-side handlers are idempotent
- Using `Map.set()` or similar idempotent operations

### **MongoDB Transaction Errors**

Common issues:
- Not running replica set: `Transaction not supported`
- Solution: Initialize replica set (see Configuration)

## 🚀 Scaling

### **Horizontal Scaling**

The outbox pattern supports multiple instances:

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│  Server 1  │  │  Server 2  │  │  Server 3  │
│  (API)     │  │  (API)     │  │  (API)     │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │
      └───────────────┼───────────────┘
                      ↓
               ┌─────────────┐
               │   MongoDB   │
               │   (Outbox)  │
               └──────┬──────┘
                      ↓
    ┌─────────────────┼─────────────────┐
    ↓                 ↓                 ↓
┌─────────┐     ┌─────────┐     ┌─────────┐
│Publisher│     │Publisher│     │Publisher│
│Worker 1 │     │Worker 2 │     │Worker 3 │
└────┬────┘     └────┬────┘     └────┬────┘
     └───────────────┼───────────────┘
                     ↓
              ┌─────────────┐
              │Redis Stream │
              └──────┬──────┘
                     ↓
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│Consumer 1│  │Consumer 2│  │Consumer 3│
└────┬─────┘  └────┬─────┘  └────┬─────┘
     ↓             ↓             ↓
  Socket.IO    Socket.IO    Socket.IO
```

**Key points:**
- Multiple publishers can safely poll the outbox concurrently
- Each publisher processes different events (no conflicts)
- Consumer groups distribute messages across consumers
- No coordination needed between instances

## 📚 References

- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Redis Streams](https://redis.io/docs/data-types/streams/)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [Consumer Groups](https://redis.io/docs/data-types/streams-tutorial/#consumer-groups)

## ✅ Best Practices

1. **Monitor outbox size** - Alert if backlog grows
2. **Set TTL on published events** - Auto-cleanup (currently 7 days)
3. **Log worker health** - Track publish rate, consumer lag
4. **Test failure scenarios** - Redis down, MongoDB down, worker crash
5. **Use idempotent handlers** - Client-side and server-side
6. **Enable Redis persistence** - AOF or RDB for durability
7. **Run MongoDB replica set** - Even in development
8. **Graceful shutdown** - Close workers before closing connections

