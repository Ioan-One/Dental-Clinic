import { WebSocketServer, WebSocket } from 'ws';

export const wss = new WebSocketServer({ noServer: true });

export const broadcastBatch = (payload) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'NEW_BATCH', payload }));
    }
  });
};

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});
