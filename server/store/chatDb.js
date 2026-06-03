import Datastore from '@seald-io/nedb';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// NeDB datastore — persistent NoSQL document database stored on disk
export const chatDb = new Datastore({
  filename: path.join(__dirname, '../../data/chat_messages.db'),
  autoload: true,
  timestampData: true,
});

// Keep only the last 7 days of messages (compact every 5 minutes)
chatDb.setAutocompactionInterval(5 * 60 * 1000);

export const insertMessage = (doc) =>
  new Promise((resolve, reject) =>
    chatDb.insert(doc, (err, newDoc) => (err ? reject(err) : resolve(newDoc)))
  );

export const getRecentMessages = (limit = 50) =>
  new Promise((resolve, reject) =>
    chatDb
      .find({})
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec((err, docs) => (err ? reject(err) : resolve(docs)))
  );
