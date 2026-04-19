// EchoWise — AI Core
// Uses Anthropic API for intelligent Hindi responses

const SCENARIOS = [
  "Accident hua, company bol rahi hai meri galti hai, kya karun? Mujhe apne rights batao.",
  "Pichhle 2 mahine se salary nahi mili. HR call nahi utha raha. Kya karun?",
  "Main delivery worker hun, mujhe kaunsi government schemes mil sakti hain?",
  "Yeh insurance form samajh nahi aa raha — claim kaise karun?"
];

const SYSTEM_PROMPT = `Tu EchoWise hai — India ke gig workers (delivery boys, auto drivers, daily wage workers) ka AI assistant.

RULES:
- Hamesha Hindi ya Hinglish mein jawab de
- Simple, clear language use kar — jaise koi dost samjha raha ho
- Practical steps dena — generic advice nahi
- Relevant government schemes mention karna agar applicable ho
- Legal rights clearly explain karna
- Response 150-200 words mein rakhna
- Emojis use kar for better readability
- Format: Brief explanation → Key rights/steps → Action items

Tu ek helpful, caring assistant hai jo India ke invisible workforce ki madad karta hai.`;

let isListening = false;
let recognition = null;
let chatHistory = [];

// Initialize speech recognition
function initSpeech() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      document.getElementById('userInput').value = transcript;
      stopMic();
    };

    recognition.onerror = () => stopMic();
    recognition.onend = () => stopMic();
  }
}

function toggleMic() {
  if (!recognition) { initSpeech(); }
  if (isListening) {
    stopMic();
  } else {
    startMic();
  }
}

function startMic() {
  if (!recognition) {
    alert('Voice recognition supported nahi hai is browser mein. Chrome try karo.');
    return;
  }
  isListening = true;
  recognition.start();
  document.getElementById('micBtn').classList.add('active');
  document.getElementById('micStatus').style.display = 'block';
}

function stopMic() {
  isListening = false;
  if (recognition) recognition.stop();
  document.getElementById('micBtn').classList.remove('active');
  document.getElementById('micStatus').style.display = 'none';
}

function setScenario(index) {
  document.querySelectorAll('.scenario-btn').forEach((b, i) => {
    b.classList.toggle('active', i === index);
  });
  document.getElementById('userInput').value = SCENARIOS[index];
}

function showDemo() {
  document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

function addMessage(text, role) {
  const chatWindow = document.getElementById('chatWindow');

  // Remove welcome message
  const welcome = chatWindow.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.className = `msg ${role}`;

  if (role === 'ai') {
    msg.innerHTML = `
      <div class="msg-header">
        <span>◎</span> EchoWise
      </div>
      <div>${formatResponse(text)}</div>
    `;
  } else {
    msg.textContent = text;
  }

  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return msg;
}

function formatResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/✓/g, '<span style="color:#4ade80">✓</span>')
    .replace(/→/g, '<span style="color:var(--accent)">→</span>')
    .replace(/\n/g, '<br>');
}

function showTyping() {
  const chatWindow = document.getElementById('chatWindow');
  const typing = document.createElement('div');
  typing.className = 'msg ai';
  typing.id = 'typingIndicator';
  typing.innerHTML = `
    <div class="msg-header"><span>◎</span> EchoWise soch raha hai...</div>
    <div style="display:flex;gap:5px;padding:4px 0">
      <span style="width:6px;height:6px;background:var(--text3);border-radius:50%;animation:bounce 1.2s infinite;display:block"></span>
      <span style="width:6px;height:6px;background:var(--text3);border-radius:50%;animation:bounce 1.2s 0.2s infinite;display:block"></span>
      <span style="width:6px;height:6px;background:var(--text3);border-radius:50%;animation:bounce 1.2s 0.4s infinite;display:block"></span>
    </div>
  `;
  chatWindow.appendChild(typing);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  // Add user message
  addMessage(text, 'user');
  chatHistory.push({ role: 'user', content: text });

  // Show typing + loading bar
  showTyping();
  const loadingBar = document.getElementById('loadingBar');
  loadingBar.style.display = 'block';
  document.querySelector('.loading-fill').style.animation = 'none';
  setTimeout(() => {
    document.querySelector('.loading-fill').style.animation = 'load 3s ease forwards';
  }, 10);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: chatHistory.slice(-6) // keep last 6 messages for context
      })
    });

    const data = await response.json();
    const aiText = data.content?.[0]?.text || getFallbackResponse(text);

    removeTyping();
    loadingBar.style.display = 'none';

    addMessage(aiText, 'ai');
    chatHistory.push({ role: 'assistant', content: aiText });

    // Text to speech (optional)
    speakResponse(aiText);

  } catch (err) {
    removeTyping();
    loadingBar.style.display = 'none';
    const fallback = getFallbackResponse(text);
    addMessage(fallback, 'ai');
  }
}

function speakResponse(text) {
  if ('speechSynthesis' in window) {
    // Clean text for speech
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[✓→★⚠️]/g, '').substring(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

function getFallbackResponse(query) {
  const q = query.toLowerCase();

  if (q.includes('accident') || q.includes('company') || q.includes('galti')) {
    return `⚖️ **Aapke Rights (Motor Vehicles Act):**\n\n✓ Company directly aapko responsible nahi kar sakti bina investigation ke\n✓ Section 163A ke under compensation milna chahiye\n✓ E-Shram card hai toh insurance claim ho sakta hai\n\n**Turant karo:**\n→ FIR file karo nearest police station mein\n→ District Legal Aid Authority se FREE help lo\n→ Labour Commissioner office mein complaint do\n\n📞 National Legal Aid Helpline: **15100**`;
  }

  if (q.includes('salary') || q.includes('payment') || q.includes('paise')) {
    return `💰 **Salary nahi mili — Aapka Haq:**\n\n✓ Payment of Wages Act ke under salary time pe milna compulsory hai\n✓ Delay pe penalty employer ko bharna hota hai\n✓ Labour Court mein complaint FREE hai\n\n**Steps:**\n→ Written complaint do employer ko (WhatsApp bhi valid hai)\n→ Labour Department mein online complaint: **shramsuvidha.gov.in**\n→ Magistrate court mein application — fee nahi lagti\n\n📞 Labour Helpline: **1800-11-1363** (Free)`;
  }

  if (q.includes('scheme') || q.includes('yojana') || q.includes('government')) {
    return `🏛️ **Aapke liye Top Government Schemes:**\n\n✓ **E-Shram Card** — ₹2 lakh accident insurance FREE\n✓ **PM SVANidhi** — ₹10,000 loan bina guarantee ke\n✓ **PMJAY (Ayushman Bharat)** — ₹5 lakh health insurance FREE\n✓ **PMJJBY** — ₹2 lakh life insurance sirf ₹436/year\n\n**Register karo:**\n→ E-Shram: **eshram.gov.in**\n→ Ayushman: **pmjay.gov.in**\n→ Nearest CSC Center (Common Service Centre) pe jaao — FREE registration`;
  }

  return `🙏 **Samajh gaya aapki baat:**\n\nAapki problem ke liye:\n✓ District Legal Aid Authority FREE help deti hai\n✓ Labour Department se consult karo\n✓ MyScheme portal pe check karo: **myscheme.gov.in**\n\n→ Zyada detail mein batao — main specific help dunga\n\n📞 National Helpline: **14434** (Pradhan Mantri helpline)`;
}

// Enter key to send
document.addEventListener('DOMContentLoaded', () => {
  initSpeech();

  document.getElementById('userInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Animate elements on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeUp 0.5s ease both';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.problem-card, .step, .tech-card, .team-card, .impact-item').forEach(el => {
    observer.observe(el);
  });
});
