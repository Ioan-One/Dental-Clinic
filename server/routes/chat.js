import { Router } from 'express';
import { getRecentMessages } from '../store/chatDb.js';

const router = Router();

// GET /api/chat/messages — last 50 messages ordered oldest-first
router.get('/messages', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const messages = await getRecentMessages(limit);
  return res.json(messages);
});

export default router;
