/* Robô Olhinhos: animação, reconhecimento e síntese de voz sem dependências. */
'use strict';

const robot = document.querySelector('#robot');
const eyes = Array.from(document.querySelectorAll('.eye'));
const statusText = document.querySelector('#statusText');
const talkButton = document.querySelector('#talkButton');
const sleepButton = document.querySelector('#sleepButton');
const settings = document.querySelector('#settingsDialog');
const toast = document.querySelector('#toast');
const stateLabels = { ready: 'Pronto', listening: 'Ouvindo', thinking: 'Pensando', speaking: 'Falando', sleepy: 'Dormindo' };
const defaults = { robotName: 'Olhinhos', kids: false, endpoint: '' };
let state = 'ready';
let recognition = null;
let blinkTimer = 0;
let motionTimer = 0;
let toastTimer = 0;
let speechFallbackTimer = 0;
let config = loadConfig();

function loadConfig() {
  try { const saved = JSON.parse(localStorage.getItem('roboOlhinhosConfig') || 'null'); return saved && typeof saved === 'object' ? { ...defaults, ...saved } : { ...defaults }; }
  catch (_) { return { ...defaults }; }
}
function setState(next) {
  state = next; robot.dataset.state = next; statusText.textContent = stateLabels[next] || next;
  talkButton.textContent = next === 'listening' ? 'Parar' : 'Conversar';
  sleepButton.textContent = next === 'sleepy' ? '☀' : '☾';
  sleepButton.setAttribute('aria-label', next === 'sleepy' ? 'Acordar o robô' : 'Colocar o robô para dormir');
  sleepButton.title = next === 'sleepy' ? 'Acordar' : 'Dormir';
}
function moveEyes(x, y) {
  eyes.forEach((eye, i) => { const iris = eye.querySelector('.iris'); const independent = i ? -x * 0.18 : x * 0.18; iris.style.setProperty('--x', `${x + independent}%`); iris.style.setProperty('--y', `${y + (i ? 2 : -2)}%`); eye.style.setProperty('--tilt', `${(i ? -1 : 1) * x * 0.035}deg`); });
}
function blink(doubleBlink) {
  eyes.forEach(eye => { eye.classList.add('blink'); window.setTimeout(() => eye.classList.remove('blink'), 145); });
  if (doubleBlink) window.setTimeout(() => blink(false), 290);
}
function scheduleBlink() {
  window.clearTimeout(blinkTimer); blinkTimer = window.setTimeout(() => { if (state === 'ready' || state === 'sleepy') blink(Math.random() < 0.16); scheduleBlink(); }, 2300 + Math.random() * 5000);
}
function naturalMotion() {
  if (state === 'ready') moveEyes(-18 + Math.random() * 36, -12 + Math.random() * 25);
  motionTimer = window.setTimeout(naturalMotion, 1800 + Math.random() * 2400);
}
function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3500); }
function toggleSleep() {
  if (state === 'sleepy') { setState('ready'); moveEyes(0, 0); showToast('Olhinhos acordou!'); }
  else { if (state === 'listening' && recognition) recognition.abort(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setState('sleepy'); moveEyes(0, 28); showToast('Boa noite, Olhinhos!'); }
}
function localReply(message) { const text = message.toLocaleLowerCase('pt-BR'); const name = config.robotName || defaults.robotName; if (text.includes('oi') || text.includes('olá') || text.includes('ola')) return `Olá! Eu sou o ${name}. Que bom falar com você!`; if (text.includes('nome')) return `Meu nome é ${name}!`; if (text.includes('obrigad')) return 'De nada!'; return config.kids ? 'Que legal! Vamos descobrir isso juntos!' : 'Ainda estou aprendendo, mas gostei de conversar com você!'; }
async function askAI(message) { const endpoint = (config.endpoint || '').trim(); if (!endpoint) return localReply(message); const controller = typeof AbortController === 'function' ? new AbortController() : null; const timeout = window.setTimeout(() => controller && controller.abort(), 20000); try { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ message, robotName: config.robotName || defaults.robotName, kids: Boolean(config.kids) }), signal: controller ? controller.signal : undefined }); if (!response.ok) throw new Error('endpoint'); const data = await response.json(); if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('reply'); return data.reply.trim(); } catch (_) { showToast('Endpoint indisponível — usando resposta local.'); return localReply(message); } finally { window.clearTimeout(timeout); } }
function choosePortugueseVoice() { if (!('speechSynthesis' in window)) return null; const voices = window.speechSynthesis.getVoices(); return voices.find(voice => /^pt-BR$/i.test(voice.lang)) || voices.find(voice => /^pt(-|_)/i.test(voice.lang)) || null; }
function speak(text) { return new Promise(resolve => { if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') { showToast('A fala não é suportada neste navegador.'); resolve(); return; } window.clearTimeout(speechFallbackTimer); window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(String(text)); utterance.lang = 'pt-BR'; utterance.rate = config.kids ? 0.96 : 0.98; utterance.pitch = 1.12; const voice = choosePortugueseVoice(); if (voice) utterance.voice = voice; let finished = false; const done = () => { if (finished) return; finished = true; window.clearTimeout(speechFallbackTimer); resolve(); }; utterance.onend = done; utterance.onerror = done; setState('speaking'); window.speechSynthesis.speak(utterance); window.setTimeout(() => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 80); speechFallbackTimer = window.setTimeout(done, Math.max(8000, String(text).length * 180)); }); }
function startConversation() { const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (state === 'sleepy') { showToast('Toque no ☀ para me acordar primeiro.'); return; } if (!SpeechRecognition) { showToast('O Safari deste dispositivo não oferece reconhecimento de voz.'); return; } if (state === 'listening') { if (recognition) recognition.stop(); return; } if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.getVoices(); } recognition = new SpeechRecognition(); recognition.lang = 'pt-BR'; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.continuous = false; recognition.onstart = () => { setState('listening'); moveEyes(0, -8); }; recognition.onerror = event => { setState('ready'); showToast(event.error === 'not-allowed' ? 'Permissão do microfone negada.' : 'Não consegui ouvir. Tente novamente.'); }; recognition.onresult = async event => { const message = event.results[0] && event.results[0][0] ? event.results[0][0].transcript.trim() : ''; if (!message) { setState('ready'); return; } setState('thinking'); moveEyes(20, -25); const reply = await askAI(message); await speak(reply); setState('ready'); }; recognition.onend = () => { if (state === 'listening') setState('ready'); }; try { recognition.start(); } catch (_) { setState('ready'); showToast('Não foi possível iniciar o microfone.'); } }
talkButton.addEventListener('click', startConversation);
sleepButton.addEventListener('click', toggleSleep);
document.querySelector('#settingsButton').addEventListener('click', () => { document.querySelector('#robotName').value = config.robotName; document.querySelector('#kidsMode').checked = config.kids; document.querySelector('#endpoint').value = config.endpoint; if (typeof settings.showModal === 'function') settings.showModal(); else settings.setAttribute('open', ''); });
document.querySelector('#settingsForm').addEventListener('submit', () => { config = { robotName: document.querySelector('#robotName').value.trim() || defaults.robotName, kids: document.querySelector('#kidsMode').checked, endpoint: document.querySelector('#endpoint').value.trim() }; localStorage.setItem('roboOlhinhosConfig', JSON.stringify(config)); showToast('Configurações salvas.'); });
document.querySelector('#fullscreenButton').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else showToast('Use Compartilhar > Adicionar à Tela de Início no Safari.'); } catch (_) { showToast('Use Compartilhar > Adicionar à Tela de Início no Safari.'); } });
window.addEventListener('orientationchange', () => window.setTimeout(() => moveEyes(0, 0), 120)); window.addEventListener('resize', () => document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`)); window.addEventListener('pagehide', () => { window.clearTimeout(blinkTimer); window.clearTimeout(motionTimer); window.clearTimeout(speechFallbackTimer); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); if (recognition) recognition.abort(); }); if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => {};
moveEyes(0, 0); scheduleBlink(); naturalMotion(); if ('serviceWorker' in navigator && window.isSecureContext) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}));
