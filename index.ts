import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

async function start() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('smart-event-scheduler');
    const events = db.collection('events');

    // GET /events - get all events
    app.get('/events', async (req, res) => {
      const allEvents = await events.find().sort({ date: 1, time: 1 }).toArray();
      res.json(allEvents);
    });

    // POST /events - add event with simple AI categorization
    app.post('/events', async (req, res) => {
      const { title, date, time, notes } = req.body;

      if (!title || !date || !time) {
        return res.status(400).json({ error: 'Title, date and time are required' });
      }

      // Simple AI categorization
      const titleNotes = (title + ' ' + (notes || '')).toLowerCase();

      let category = 'Other';
      const workKeywords = ['meeting', 'project', 'client'];
      const personalKeywords = ['birthday', 'family', 'party'];

      if (workKeywords.some(k => titleNotes.includes(k))) category = 'Work';
      else if (personalKeywords.some(k => titleNotes.includes(k))) category = 'Personal';

      const event = { title, date, time, notes, category, archived: false };
      const result = await events.insertOne(event);
      res.status(201).json(result.insertedId);
    });

    // PUT /events/:id - archive event
    app.put('/events/:id', async (req, res) => {
      const { id } = req.params;
      const { archived } = req.body;

      if (typeof archived !== 'boolean') {
        return res.status(400).json({ error: 'Archived status must be boolean' });
      }

      const { ObjectId } = await import('mongodb');
      const result = await events.updateOne({ _id: new ObjectId(id) }, { $set: { archived } });

      if (result.matchedCount === 0) return res.status(404).json({ error: 'Event not found' });

      res.json({ success: true });
    });

    // DELETE /events/:id - delete event
    app.delete('/events/:id', async (req, res) => {
      const { id } = req.params;
      const { ObjectId } = await import('mongodb');
      const result = await events.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) return res.status(404).json({ error: 'Event not found' });

      res.json({ success: true });
    });

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
