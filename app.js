/* Robô Olhinhos: animação, voz e conversa sem dependências externas. */
const robot = document.querySelector('#robot');
const eyes = [...document.querySelectorAll('.eye')];
const statusText = document.querySelector('#statusText');
const talkButton = document.querySelector('#talkButton');
const settings = document.querySelector('#settingsDialog');
const toast = document.querySelector('#toast');
const stateLabels = { ready: 'Pronto', listening: 'Ouvindo', thinking: 'Pensando', speaking: 'Falando', sleepy: 'Sonolento' };
let state = 'ready';
let recognition = null;
let blinkTimer;
let config = JSON.parse(localStorage.getItem('roboOlhinhosConfig') || 'null') || { robotName: 'Olhinhos', kids: false, endpoint: '' };

function setState(next) { state = next; robot.dataset.state = next; statusText.textContent = stateLabels[next] || next; talkButton.textContent = next === 'listening' ? 'Parar' : 'Conversar'; }
function moveEyes(x, y) { eyes.forEach((eye, i) => { const independent = i ? -x * .18 : x * .18; eye.querySelector('.iris').style.setProperty('--x', `${x + independent}%`); eye.querySelector('.iris').style.setProperty('--y', `${y + (i ? 2 : -2)}%`); eye.style.setProperty('--tilt', `${(i ? -1 : 1) * x * .035}deg`); }); }
function blink(double = false) { eyes.forEach(e => { e.classList.add('blink'); setTimeout(() => e.classList.remove('blink'), 145); }); if (double) setTimeout(() => blink(false), 290); }
function scheduleBlink() { clearTimeout(blinkTimer); blinkTimer = setTimeout(() => { if (state === 'ready' || state === 'sleepy') blink(Math.random() < .16); scheduleBlink(); }, 2300 + Math.random() * 5000); }
function naturalMotion() { if (state === 'ready') moveEyes(-18 + Math.random() * 36, -12 + Math.random() * 25); setTimeout(naturalMotion, 1800 + Math.random() * 2400); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); }

async function askAI(message) {
  if (!config.endpoint) return localReply(message);
  try {
    const response = await fetch(config.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, robotName: config.robotName || 'Olhinhos', kids: Boolean(config.kids) }) });
    if (!response.ok) throw new Error('endpoint');
    const data = await response.json();
    if (!data.reply) throw new Error('reply');
    return data.reply;
  } catch { showToast('Endpoint indisponível — usando resposta local.'); return localReply(message); }
}
function localReply(message) { const m = message.toLowerCase(); if (m.includes('oi') || m.includes('olá')) return `Olá! Eu sou o ${config.robotName || 'Olhinhos'}. Que bom falar com você!`; if (m.includes('nome')) return `Meu nome é ${config.robotName || 'Olhinhos'}!`; if (m.includes('obrigad')) return 'De nada!'; return config.kids ? 'Que legal! Vamos descobrir isso juntos!' : 'Ainda estou aprendendo, mas gostei de conversar com você!'; }
function speak(text) { return new Promise(resolve => { if (!('speechSynthesis' in window)) { resolve(); return; } window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'pt-BR'; utterance.rate = config.kids ? .98 : 1; utterance.pitch = 1.12; utterance.onend = resolve; utterance.onerror = resolve; setState('speaking'); speechSynthesis.speak(utterance); }); }
function startConversation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { showToast('Reconhecimento de voz não disponível neste navegador.'); return; }
  if (state === 'listening') { recognition?.stop(); return; }
  recognition = new SpeechRecognition(); recognition.lang = 'pt-BR'; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.continuous = false;
  recognition.onstart = () => { setState('listening'); moveEyes(0, -8); };
  recognition.onerror = event => { setState('ready'); showToast(event.error === 'not-allowed' ? 'Permissão do microfone negada.' : 'Não consegui ouvir. Tente novamente.'); };
  recognition.onresult = async event => { const message = event.results[0][0].transcript; setState('thinking'); moveEyes(20, -25); const reply = await askAI(message); await speak(reply); setState('ready'); };
  recognition.onend = () => { if (state === 'listening') setState('ready'); };
  try { recognition.start(); } catch { showToast('Não foi possível iniciar o microfone.'); }
}
talkButton.addEventListener('click', startConversation);
document.querySelector('#settingsButton').addEventListener('click', () => { document.querySelector('#robotName').value = config.robotName; document.querySelector('#kidsMode').checked = config.kids; document.querySelector('#endpoint').value = config.endpoint; settings.showModal(); });
document.querySelector('#settingsForm').addEventListener('submit', () => { config = { robotName: document.querySelector('#robotName').value.trim() || 'Olhinhos', kids: document.querySelector('#kidsMode').checked, endpoint: document.querySelector('#endpoint').value.trim() }; localStorage.setItem('roboOlhinhosConfig', JSON.stringify(config)); showToast('Configurações salvas.'); });
document.querySelector('#fullscreenButton').addEventListener('click', async () => { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { showToast('Tela cheia: use o menu Compartilhar do Safari para adicionar à Tela de Início.'); } });
moveEyes(0, 0); scheduleBlink(); naturalMotion();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
