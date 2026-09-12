/**
 * Dr. Talha Clinic AI Chatbot Widget
 * Embeddable Floating Chat Widget
 */
(function() {
  // Configuration
  const config = window.DrTalhaChatConfig || {
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api/chat'
      : '/api/chat',
    clinicName: 'Talha Clinic & Maternity Home',
    doctorTitle: "Dr. Talha's Assistant",
    avatarUrl: 'logo.png',
    phone: '+92 307 7953767',
    address: 'New Sawera Point, Near Hashmi Chowk, Makhdoom Rasheed'
  };

  const quickChips = [
    { label: "📅 Book Appointment", prompt: "How can I book an appointment?" },
    { label: "🕒 Clinic Timings", prompt: "What are the clinic and doctor timings?" },
    { label: "🏥 Services Offered", prompt: "What medical services are available at the clinic?" },
    { label: "📞 Contact & Address", prompt: "What is the clinic contact number and address?" }
  ];

  let conversationHistory = [];
  let isWaitingForResponse = false;
  let isOpen = false;

  // Render HTML Structure
  function initWidget() {
    // If already initialized, avoid duplicates
    if (document.getElementById('dt-widget-root')) return;

    const root = document.createElement('div');
    root.id = 'dt-widget-root';
    root.innerHTML = `
      <!-- Launcher Button -->
      <button class="dt-widget-launcher" id="dtLauncher" aria-label="Open Dr. Talha Clinic AI Chat">
        <span class="dt-widget-badge" id="dtBadge">1</span>
        <svg class="dt-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="dt-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Chat Box -->
      <div class="dt-widget-box" id="dtChatBox" role="dialog" aria-hidden="true">
        <!-- Header -->
        <div class="dt-widget-header">
          <div class="dt-header-info">
            <div class="dt-avatar-wrap">
              <img src="${config.avatarUrl}" alt="Clinic Logo" class="dt-avatar-img" onerror="this.src='doctor.png'">
              <span class="dt-status-dot" title="Online 24/7"></span>
            </div>
            <div>
              <h3 class="dt-header-title">${config.doctorTitle}</h3>
              <span class="dt-header-sub">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#1A9E6B" stroke="none"><circle cx="12" cy="12" r="10"/></svg>
                Online • 24/7 Emergency Care
              </span>
            </div>
          </div>
          <div class="dt-header-actions">
            <button class="dt-header-btn" id="dtCloseBtn" title="Close Chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Messages Area -->
        <div class="dt-widget-messages" id="dtMessages">
          <div class="dt-message-row dt-bot">
            <div class="dt-message-bubble">
              Assalam-o-Alaikum! 👋<br>
              Main <strong>Talha Clinic & Maternity Home</strong> ka Virtual Assistant hoon.<br><br>
              Aap Dr. Talha ki clinic timings, services, lab test ya appointment ke baarey mein pooch sakte hain.
              <span class="dt-message-time">${getCurrentTime()}</span>
            </div>
          </div>

          <!-- Quick Chips -->
          <div class="dt-widget-chips" id="dtChips">
            ${quickChips.map(chip => `<button class="dt-chip-btn" data-prompt="${chip.prompt}">${chip.label}</button>`).join('')}
          </div>

          <!-- Typing Indicator -->
          <div class="dt-typing-indicator" id="dtTyping">
            <span class="dt-typing-dot"></span>
            <span class="dt-typing-dot"></span>
            <span class="dt-typing-dot"></span>
          </div>
        </div>

        <!-- Input Area -->
        <form class="dt-widget-input-area" id="dtForm">
          <input type="text" id="dtInput" class="dt-widget-input" placeholder="Sawāl poochein (Urdu/English)..." autocomplete="off" maxlength="300">
          <button type="submit" class="dt-widget-send-btn" id="dtSendBtn" aria-label="Send Message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>

        <div class="dt-widget-footer-text">
          Direct Call: <a href="tel:${config.phone.replace(/\s+/g, '')}">${config.phone}</a> • Makhdoom Rasheed
        </div>
      </div>
    `;

    document.body.appendChild(root);

    bindEvents();
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatMessageText(text) {
    if (!text) return '';
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet points * or -
    formatted = formatted.replace(/(?:^|\n)[*-]\s+(.+)/g, '<br>• $1');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Phone numbers clickable
    formatted = formatted.replace(/(\+?92[\s-]?\d{3}[\s-]?\d{7}|\b03\d{2}[\s-]?\d{7}\b)/g, '<a href="tel:$1" style="color:#1568D6;font-weight:600;text-decoration:underline;">$1</a>');

    return formatted;
  }

  function toggleChat(openState) {
    isOpen = typeof openState === 'boolean' ? openState : !isOpen;
    const box = document.getElementById('dtChatBox');
    const launcher = document.getElementById('dtLauncher');
    const badge = document.getElementById('dtBadge');

    if (isOpen) {
      box.classList.add('dt-open');
      launcher.classList.add('dt-active');
      box.setAttribute('aria-hidden', 'false');
      if (badge) badge.style.display = 'none';
      setTimeout(() => {
        document.getElementById('dtInput').focus();
      }, 200);
    } else {
      box.classList.remove('dt-open');
      launcher.classList.remove('dt-active');
      box.setAttribute('aria-hidden', 'true');
    }
  }

  function scrollToBottom() {
    const messages = document.getElementById('dtMessages');
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }

  function appendMessage(sender, text) {
    const messages = document.getElementById('dtMessages');
    const typing = document.getElementById('dtTyping');

    const row = document.createElement('div');
    row.className = `dt-message-row ${sender === 'user' ? 'dt-user' : 'dt-bot'}`;

    const bubble = document.createElement('div');
    bubble.className = 'dt-message-bubble';
    bubble.innerHTML = `${formatMessageText(text)}<span class="dt-message-time">${getCurrentTime()}</span>`;

    row.appendChild(bubble);
    messages.insertBefore(row, typing);
    scrollToBottom();
  }

  function setTyping(loading) {
    const typing = document.getElementById('dtTyping');
    if (loading) {
      typing.classList.add('dt-active');
    } else {
      typing.classList.remove('dt-active');
    }
    scrollToBottom();
  }

  async function sendMessage(text) {
    if (!text || !text.trim() || isWaitingForResponse) return;
    const cleanText = text.trim();

    appendMessage('user', cleanText);
    conversationHistory.push({ role: 'user', content: cleanText });

    isWaitingForResponse = true;
    setTyping(true);

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: cleanText,
          history: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || "Maaf kijiye, abhi jawab nahi mil saka. Baraye mehrbani clinic par call karein: +92 307 7953767.";

      appendMessage('bot', reply);
      conversationHistory.push({ role: 'assistant', content: reply });

    } catch (err) {
      console.error('Chat error:', err);
      appendMessage('bot', "Dr. Talha Clinic 24/7 khula hai. Kisi bhi sawal ya emergency ke liye direct call karein: +92 307 7953767.");
    } finally {
      isWaitingForResponse = false;
      setTyping(false);
    }
  }

  function bindEvents() {
    const launcher = document.getElementById('dtLauncher');
    const closeBtn = document.getElementById('dtCloseBtn');
    const form = document.getElementById('dtForm');
    const input = document.getElementById('dtInput');
    const chips = document.getElementById('dtChips');

    launcher.addEventListener('click', () => toggleChat());
    closeBtn.addEventListener('click', () => toggleChat(false));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value;
      input.value = '';
      sendMessage(val);
    });

    if (chips) {
      chips.addEventListener('click', (e) => {
        const btn = e.target.closest('.dt-chip-btn');
        if (btn && btn.dataset.prompt) {
          sendMessage(btn.dataset.prompt);
        }
      });
    }
  }

  // Auto-init on DOMContentLoaded or immediate if already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
