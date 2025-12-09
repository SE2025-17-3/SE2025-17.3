import express from 'express';
import Outbox from '../models/Outbox.js';

const router = express.Router();

// DLQ stattistics
router.get('/dlq-stats', async (req, res) => {
    try {
        const stats = await Outbox.getDLQStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching DLQ stats', error: error.message });
    }
});

// get failed events (DLQ)
router.get('/failed-events', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || 100);
        const events = await Outbox.getFailedEvents(limit);
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching failed events', error: error.message });
    }
});

export default router;