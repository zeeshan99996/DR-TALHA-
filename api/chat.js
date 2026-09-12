const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');
const knowledgeBase = require('../backend/knowledge_base.json');
const { SYSTEM_PROMPT, REFUSAL_MESSAGE } = require('../backend/system_prompt');

// In-memory cache for serverless invocation reuse
const responseCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 700,
      }
    });
  } catch (err) {
    console.error('Failed to init Gemini in serverless function:', err.message);
  }
}

function normalizeText(text) {
  return (text || '').toLowerCase().trim().replace(/[^\w\s\u0600-\u06FF]/gi, '');
}

function getFastPathResponse(query) {
  const q = normalizeText(query);
  if (!q) return null;

  // Greetings
  if (/^(salam|assalam|assalamu|aoa|hi|hello|hey|slam|assalam\s*o\s*alaikum|assalamu\s*alaikum)/.test(q)) {
    return "Walaikum Assalam! Main Talha Clinic & Maternity Home ka Virtual Assistant hoon. Main aapki kya madad kar sakta hoon? Aap doctor timings, services, lab tests ya appointment ke baarey mein pooch sakte hain.";
  }

  // Obvious out-of-scope patterns
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

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      clinic: knowledgeBase.clinic_info.name,
      geminiConfigured: !!model
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const trimmedMessage = message.trim();
    const cacheKey = normalizeText(trimmedMessage);

    // 1. Fast Path Heuristics (0 tokens)
    const fastPath = getFastPathResponse(trimmedMessage);
    if (fastPath) {
      return res.status(200).json({ reply: fastPath, source: 'fast_path' });
    }

    // 2. In-Memory Cache (0 tokens)
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json({ reply: cachedResponse, source: 'cache' });
    }

    // 3. Fallback if Gemini is not yet configured in Vercel Environment Variables
    if (!model) {
      return res.status(200).json({
        reply: "Dr. Talha Clinic 24/7 khula hai. Appointment ya maloomat ke liye direct call karein: +92 307 7953767 (New Sawera Point, Near Hashmi Chowk, Makhdoom Rasheed).",
        source: 'fallback'
      });
    }

    // 4. Generate Content with Gemini 2.5 Flash
    let promptText = trimmedMessage;
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

    responseCache.set(cacheKey, replyText);

    return res.status(200).json({ reply: replyText, source: 'gemini' });

  } catch (error) {
    console.error('Vercel API Error:', error.message || error);

    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return res.status(200).json({
        reply: "Abhi clinic helpline par patients ka rush hai. Baraye mehrbani direct call karein: +92 307 7953767 (24/7 Available) ya thori dair baad dobara koshish karein.",
        quotaExceeded: true
      });
    }

    return res.status(200).json({
      reply: "Talha Clinic & Maternity Home 24/7 khula hai. Kisi bhi sawal ya emergency ke liye direct call karein: +92 307 7953767.",
      error: true
    });
  }
};
