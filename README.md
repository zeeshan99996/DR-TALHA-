# Talha Clinic & Maternity Home — Website & AI Chatbot

Official website and AI Chatbot Assistant for **Talha Clinic & Maternity Home**, Makhdoom Rasheed (24/7 Emergency Care).

---

## 🌟 Key Features

- **24/7 Healthcare Services**: General consultation, Maternity Care, Emergency, Laboratory, Pharmacy, Ultrasound, Vaccination, and Digital X-Ray.
- **AI Virtual Assistant (Dr. Talha's Assistant)**:
  - **Strictly Grounded**: Only responds to queries regarding Dr. Talha's clinic, doctor schedules, services, and appointment bookings based on `knowledge_base.json`.
  - **Firm Guardrails**: Any out-of-scope questions (coding, general knowledge, politics, etc.) are strictly refused:
    > *"Maaf kijiye, main sirf Dr. Talha ki services, appointments aur clinic details ke baarey mein rehnumai kar sakta hoon."*
  - **Gemini Free-Tier Quota Protection**:
    - Powered by `gemini-1.5-flash` with token-efficient system prompts.
    - In-memory response caching (`node-cache`) for recurring patient questions to minimize API hits.
    - IP Rate-Limiting (`express-rate-limit`) preventing API exhaustion.
    - Graceful 429 quota exhaustion fallback.
  - **Embeddable Floating UI Widget**:
    - Floating launcher with unread badge and medical blue branding.
    - Quick Action Chips (`📅 Book Appointment`, `🕒 Clinic Timings`, `🏥 Services Offered`, `📞 Contact & Address`).
    - Real-time typing dots indicator.
    - Auto-scroll and responsive design for both desktop and mobile.

---

## 📂 Project Structure

```text
├── backend/
│   ├── server.js              # Express API server with caching & rate-limiting
│   ├── knowledge_base.json    # Complete clinic knowledge base
│   ├── system_prompt.js       # Strict grounding prompt & boundary rules
│   ├── package.json           # Dependencies: @google/generative-ai, express, etc.
│   ├── .env.example           # Environment template
│   └── .env                   # API Keys (Git-ignored for security)
├── frontend-widget/
│   ├── widget.js              # Vanilla JS floating chatbot widget
│   ├── widget.css             # Widget stylesheet (matches clinic theme)
│   └── index.html             # Standalone test/demo preview page
├── index.html                 # Main clinic landing page with integrated widget
├── local-server.js            # Development server with automatic /api/ proxy
└── README.md
```

---

## 🚀 Quick Start Instructions

### 1. Start the AI Backend Server
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:5000`.

### 2. Start the Website Server (in another terminal)
```bash
# In the root directory:
node local-server.js
```
Open `http://localhost:3000` in your web browser. The AI Chatbot will be active at the bottom-right corner!

---

## 🏥 Clinic Information

- **Address**: New Sawera Point, Near Hashmi Chowk, Makhdoom Rasheed
- **Phone / WhatsApp**: [+92 307 7953767](tel:+923077953767)
- **Timings**: Open 24/7 (24 Hours / 7 Days / 0 Off Days)
- **Doctors**:
  - **Dr. Talha Mahmood**: General Physician & Emergency Specialist (MBBS, FCPS, Ex DMS DHQ Vehari) — Daily 02:00 PM – 08:00 PM / 24/7 Emergency on call
  - **Dr. Bilal Yousaf**: General Physician & Medical Officer (MBBS, RMP Nishtar Hospital Multan) — Daily 08:00 AM – 02:00 PM
  - **Dr. Zaka-ur-Rehman Qureshi**: Consultant Orthopedic Surgeon (MBBS, MRCS Edin UK, FCPS Ortho, ATLS USA) — Every Friday 01:30 PM – 03:30 PM
