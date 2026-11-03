
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const authMiddleware = require('../middleware/authMiddleware');

if (!process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is missing in .env');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
  maxRetries: 1,
});

const languageNames = {
  en: 'English',
  mr: 'Marathi',
  hi: 'Hindi',
  gu: 'Gujarati',
  kn: 'Kannada',
};

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const {
      message,
      language = 'en',
      history = [],
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a message.',
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Groq API Key is missing in backend .env',
      });
    }

    const selectedLanguage = languageNames[language] || 'English';

    const messages = [
      {
        role: 'system',
        content: `
You are Dairy AI Assistant for Dairy Trust.

Help farmers and dairy owners with:
- Milk collection
- FAT and SNF
- Milk rates
- Farmer payments
- Pending payments
- Loans and bonuses
- Dairy management

Always answer in ${selectedLanguage}.

Use simple language and clear short answers.

Never invent actual farmer payment,
milk collection or account information.

You do not have direct access to the database.

Never ask for passwords, OTPs or API keys.
        `,
      },
    ];

    const safeHistory = Array.isArray(history)
      ? history
          .filter(item =>
            ['user', 'model'].includes(item.role) &&
            typeof item.text === 'string'
          )
          .slice(-6)
      : [];

    safeHistory.forEach(item => {
      messages.push({
        role: item.role === 'model' ? 'assistant' : 'user',
        content: item.text.slice(0, 1000),
      });
    });

    messages.push({
      role: 'user',
      content: message.trim(),
    });

    console.log('Trying Dairy AI model: llama-3.3-70b-versatile');

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.4,
      max_completion_tokens: 500,
    });

    const reply = completion.choices?.[0]?.message?.content;

    if (!reply || !reply.trim()) {
      throw new Error('AI returned an empty response.');
    }

    console.log('Dairy AI success: Groq');

    return res.json({
      success: true,
      reply: reply.trim(),
    });

  } catch (error) {
    console.error('Dairy AI Groq Error:', error);

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status === 401
          ? 'Groq API Key is invalid. Check backend .env.'
          : error.status === 429
          ? 'Groq API limit reached. Please try again later.'
          : error.status >= 500
          ? 'Groq AI service is temporarily unavailable.'
          : error.message || 'AI Assistant unavailable.',
    });
  }
});

module.exports = router;
