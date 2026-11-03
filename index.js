const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// --- CONFIG ---
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "gharana123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

// --- WEBHOOK VERIFICATION (For Meta) ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK VERIFIED!');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// --- RECEIVE MESSAGE ---
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    
    if (body.object && body.entry && body.entry[0].changes[0].value.messages) {
      const messageData = body.entry[0].changes[0].value.messages[0];
      const from = messageData.from;
      const msgBody = messageData.text ? messageData.text.body : "";
      
      console.log(`Message from ${from}: ${msgBody}`);

      // AI Reply from Groq
      const aiReply = await getAIReply(msgBody);

      // Send back to WhatsApp
      await sendWhatsAppMessage(from, aiReply);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.sendStatus(500);
  }
});

// --- GROQ AI FUNCTION ---
async function getAIReply(userMessage) {
  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are Dr. Gharana Clinic's professional assistant. You speak in polite Urdu mixed English. Your job is to book appointments. Ask for Name, Age, Problem, Date. If user says BOOK, start booking. Be friendly and short."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq Error:', error.response ? error.response.data : error.message);
    return "Salam! Main Dr. Clinic ka assistant hun. Appointment ke liye BOOK likhein.";
  }
}

// --- SEND WHATSAPP FUNCTION ---
async function sendWhatsAppMessage(to, text) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp",
      to: to,
      text: { body: text }
    }, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Reply sent to ${to}`);
  } catch (error) {
    console.error('Send Message Error:', error.response ? error.response.data : error.message);
  }
}

app.get('/', (req, res) => {
  res.send('Clinic Booking Bot is Running!');
});

app.listen(PORT, () => {
  console.log(`Official Bot Running on Port ${PORT}`);
});