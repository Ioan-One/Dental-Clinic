import http from 'http';
import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import app from './app.js';
import { wss } from './websocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER;

let server;
if (isProd) {
  server = http.createServer(app);
} else {
  const sslOptions = {
    key:  fs.readFileSync(path.join(__dirname, 'certs/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
  };
  server = https.createServer(sslOptions, app);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${isProd ? 'http' : 'https'}://0.0.0.0:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
