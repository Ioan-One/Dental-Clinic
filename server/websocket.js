import { WebSocketServer, WebSocket } from 'ws';
import { insertMessage } from './store/chatDb.js';

export const wss = new WebSocketServer({ noServer: true });

export const broadcast = (payload, exclude = null) => {
  wss.clients.forEach(client => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
};

export const broadcastBatch = (payload) => {
  broadcast({ type: 'NEW_BATCH', payload });
};

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'CHAT_SEND') {
      const { senderId, senderName, senderRole, message } = msg.payload ?? {};
      if (!senderId || !senderName || !message?.trim()) return;

      const doc = await insertMessage({
        senderId,
        senderName,
        senderRole: senderRole ?? 'normal',
        message: message.trim(),
      });

      // Broadcast to all connected clients including sender
      broadcast({ type: 'CHAT_MESSAGE', payload: doc });
    }
  });

  ws.on('close', () => console.log('WebSocket client disconnected'));
});
