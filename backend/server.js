require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SYSTEM_PROMPT, REFUSAL_MESSAGE } = require('./system_prompt');
const knowledgeBase = require('./knowledge_base.json');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Cache (TTL: 1 hour, check period: 2 minutes)
const responseCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Middleware
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Rate Limiter: Max 15 requests per minute per IP to protect Free Quota
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    reply: "Aap bohot taizi se messages bhej rahe hain. Baraye mehrbani 1 minute intezar karein ya foran call karein: +92 307 7953767.",
    rateLimited: true
  }
});

app.use('/api/chat', limiter);

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 700,
    }
  });
  console.log('Gemini 1.5 Flash initialized successfully.');
} else {
  console.warn('Warning: Valid GEMINI_API_KEY not found in .env. Falling back to rule-based responses.');
}

// Helpers
function normalizeText(text) {
  return (text || '').toLowerCase().trim().replace(/[^\w\s\u0600-\u06FF]/gi, '');
}

// Fast heuristic checks for rapid response & zero token waste
function getFastPathResponse(query) {
  const q = normalizeText(query);
  if (!q) return null;

  // Greetings
  if (/^(salam|assalam|assalamu|aoa|hi|hello|hey|slam)$/.test(q)) {
    return "Walaikum Assalam! Main Talha Clinic & Maternity Home ka Virtual Assistant hoon. Main aapki kya madad kar sakta hoon? Aap doctor timings, services, lab tests ya appointment ke baarey mein pooch sakte hain.";
  }

  // Obvious out-of-scope queries (coding, math, general trivia, politics, entertainment)
  const outOfScopePatterns = [
    /\b(python|javascript|java|c\+\+|coding|write a code|write a script|programming|html|css|sql)\b/i,
    /\b(president of|prime minister|capital of|who won the match|cricket score|movie|song|lyrics|recipe|cook)\b/i,
    /\b(solve this math|calculate|algebra|weather in|bitcoin|crypto|stock market)\b/i
  ];
  for (const pattern of outOfScopePatterns) {
    if (pattern.test(q)) {
      return REFUSAL_MESSAGE;
    }
  }

  return null;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    clinic: knowledgeBase.clinic_info.name,
    cachedKeys: responseCache.keys().length,
    geminiConfigured: !!model
  });
});

// Knowledge base quick retrieval endpoint
app.get('/api/knowledge', (req, res) => {
  res.json(knowledgeBase);
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const trimmedMessage = message.trim();
    const cacheKey = normalizeText(trimmedMessage);

    // 1. Check Fast-path heuristics (0 tokens used)
    const fastPath = getFastPathResponse(trimmedMessage);
    if (fastPath) {
      return res.json({ reply: fastPath, source: 'fast_path' });
    }

    // 2. Check in-memory Cache (0 tokens used)
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      return res.json({ reply: cachedResponse, source: 'cache' });
    }

    // 3. Fallback if Gemini is not configured
    if (!model) {
      return res.json({
        reply: "Dr. Talha Clinic 24/7 khula hai. Appointment ya maloomat ke liye call karein: +92 307 7953767 (New Sawera Point, Near Hashmi Chowk, Makhdoom Rasheed).",
        source: 'fallback'
      });
    }

    // 4. Build Chat context & Call Gemini 1.5 Flash
    let promptText = trimmedMessage;

    // Optional lightweight past messages if provided
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-4);
      const conversationContext = recent
        .map(h => `${h.role === 'user' ? 'Patient' : 'Assistant'}: ${h.content}`)
        .join('\n');
      promptText = `Previous conversation context:\n${conversationContext}\n\nCurrent Patient Query: ${trimmedMessage}`;
    }

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const replyText = response.text().trim();

    // Cache the verified response for identical questions
    responseCache.set(cacheKey, replyText);

    return res.json({ reply: replyText, source: 'gemini' });

  } catch (error) {
    console.error('Chat API Error:', error.message || error);

    // Handle Quota/Rate limit 429 specifically
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return res.status(200).json({
        reply: "Abhi clinic helpline par patients ka rush hai. Baraye mehrbani direct call karein: +92 307 7953767 (24/7 Available) ya thori dair baad dobara koshish karein.",
        quotaExceeded: true
      });
    }

    // General fallback
    return res.status(200).json({
      reply: "Maaf kijiye, temporary issue aya hai. Baraye mehrbani direct clinic par call karein: +92 307 7953767 (Talha Clinic & Maternity Home - 24/7 Open).",
      error: true
    });
  }
});

app.listen(PORT, () => {
  console.log(`Dr. Talha Clinic AI Chat Server running on http://localhost:${PORT}`);
});
