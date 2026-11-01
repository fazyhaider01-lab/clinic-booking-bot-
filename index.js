require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Groq = require('groq-sdk');

const app = express();
app.use(bodyParser.json());
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TOKEN = process.env.WHATSAPP_TOKEN; // Meta se milega
const PHONE_ID = process.env.PHONE_NUMBER_ID;

let appointments = [];

// Jab patient message karega
app.post('/webhook', async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const text = msg.text?.body || "";

  // AI se jawab lo
  const aiReply = await groq.chat.completions.create({
    messages: [
      { role: "system", content: `You are AI receptionist for Al-Shifa Clinic. You do appointment booking. Ask Name, Doctor, Date, Time step by step in Roman Urdu. Doctors: Dr Ahmed (General), Dr Fatima (Skin). If user says BOOK, start booking.` },
      { role: "user", content: text }
    ],
    model: "llama-3.3-70b-versatile"
  });

  const replyText = aiReply.choices[0].message.content;

  // Wapas WhatsApp par bhejo - Official API se
  await axios.post(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    messaging_product: "whatsapp",
    to: from,
    text: { body: replyText }
  }, { headers: { Authorization: `Bearer ${TOKEN}` } });

  res.sendStatus(200);
});

// Meta verification ke liye
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === 'clinic123') res.send(req.query['hub.challenge']);
  else res.sendStatus(403);
});

app.listen(3000, () => console.log('Official Bot Running on Port 3000'));