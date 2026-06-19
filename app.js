const steps = [
  { title: '1. Alimentación', text: 'La red AC se filtra y la fuente conmutada genera tensiones de stand-by, lógica y potencia.', blocks: ['ac', 'psu'], links: ['ac-psu'] },
  { title: '2. Procesado de vídeo', text: 'La placa main detecta la entrada, lee EDID, escala la imagen y genera OSD.', blocks: ['input', 'main', 'mcu'], links: ['input-main', 'keys-mcu', 'mcu-main', 'psu-main'] },
  { title: '3. Temporización', text: 'La señal LVDS/eDP llega a la T-CON, que reparte datos a drivers de filas y columnas.', blocks: ['main', 'tcon'], links: ['main-tcon'] },
  { title: '4. Iluminación', text: 'El driver LED regula corriente y PWM según el brillo pedido y las protecciones.', blocks: ['psu', 'backlight', 'mcu'], links: ['psu-backlight', 'main-backlight'] },
  { title: '5. Imagen visible', text: 'El panel modula la luz de fondo con los subpíxeles RGB para formar la imagen.', blocks: ['tcon', 'backlight', 'panel'], links: ['tcon-panel', 'backlight-panel'] }
];

const faults = {
  none: { title: 'Monitor operativo', detail: 'Señales dentro de rango', severity: 'ok', text: 'Sin avería: comprueba la cadena completa siguiendo los puntos de test de cada bloque.', badBlocks: [], values: ['12.0 V', '67.5 kHz', '60 Hz'] },
  'no-power': { title: 'Sin alimentación', detail: 'No hay 12 V en la salida de fuente', severity: 'danger', text: 'Síntoma: LED de stand-by apagado. Revisar fusible, puente rectificador, MOSFET primario, PWM y optoacoplador.', badBlocks: ['psu'], values: ['0.0 V', '0 kHz', '0 Hz'] },
  'no-backlight': { title: 'Imagen muy oscura', detail: 'Vídeo presente sin retroiluminación', severity: 'warning', text: 'Síntoma: se aprecia imagen con linterna. Medir enable BL_ON, PWM_DIM, cadena LED y driver de corriente.', badBlocks: ['backlight'], values: ['12.0 V', '67.5 kHz', '60 Hz'] },
  'bad-sync': { title: 'Pérdida de sincronismo', detail: 'Frecuencias fuera de captura', severity: 'warning', text: 'Síntoma: imagen desplazada o rodando. Verificar reloj de píxel, cable, conector, scaler y modo de entrada.', badBlocks: ['input', 'main'], values: ['12.0 V', '41.2 kHz', '48 Hz'] },
  tcon: { title: 'Fallo T-CON/LVDS', detail: 'Columnas o bandas verticales', severity: 'danger', text: 'Síntoma: franjas, media pantalla o solarización. Revisar fusibles SMD, VGH/VGL/AVDD, flex y gamma.', badBlocks: ['tcon', 'panel'], values: ['12.0 V', '67.5 kHz', '60 Hz'] },
  capacitors: { title: 'Rizado en fuente', detail: 'ESR alta provoca parpadeo', severity: 'warning', text: 'Síntoma: arranque intermitente o brillo pulsante. Medir rizado con osciloscopio y sustituir electrolíticos degradados.', badBlocks: ['psu'], values: ['10.8–12.4 V', '67.5 kHz', '60 Hz'] }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let currentStep = -1;
let timer = null;
let powered = true;

function renderTimeline() {
  $('#timeline').innerHTML = steps.map((step, index) => `<li data-step="${index}"><strong>${step.title}</strong><p>${step.text}</p></li>`).join('');
}

function setStep(index) {
  currentStep = index % steps.length;
  const step = steps[currentStep];
  $$('.block, .connections path, .timeline li').forEach((node) => node.classList.remove('active'));
  step.blocks.forEach((name) => $(`[data-block="${name}"]`)?.classList.add('active'));
  step.links.forEach((name) => $(`[data-link="${name}"]`)?.classList.add('active'));
  $(`[data-step="${currentStep}"]`)?.classList.add('active');
  $('#animationLabel').textContent = step.title;
}

function stopAnimation() {
  clearInterval(timer);
  timer = null;
  $('#playButton').textContent = '▶ Animar flujo';
  if (currentStep < 0) $('#animationLabel').textContent = 'Flujo detenido';
}

function updateScreen() {
  const brightness = Number($('#brightness').value);
  const contrast = Number($('#contrast').value);
  const signal = $('#inputSignal').value;
  const temp = $('#colorTemp').value;
  const fault = $('#faultMode').value;
  const screen = $('#screen');
  const pattern = $('#videoPattern');

  pattern.className = `video-pattern ${signal}`;
  screen.style.setProperty('--brightness', powered ? brightness / 100 : 0);
  screen.style.setProperty('--contrast', 0.65 + contrast / 100);
  screen.className = `screen ${powered ? '' : 'off'} ${fault !== 'none' ? fault : ''}`;
  screen.style.backgroundColor = temp === 'warm' ? '#1b120d' : temp === 'cool' ? '#071525' : '#05070d';
  $('#brightnessOutput').textContent = `${brightness}%`;
  $('#contrastOutput').textContent = `${contrast}%`;
  $('#backlightValue').textContent = fault === 'no-backlight' || !powered ? '0%' : `${brightness}%`;
  $('#osd').textContent = powered ? `${signal.toUpperCase()} · 1080p · ${fault === 'bad-sync' ? '48 Hz' : '60 Hz'}` : 'Sin stand-by';
}

function updateFault() {
  const key = powered ? $('#faultMode').value : 'no-power';
  const fault = faults[key];
  $$('.block').forEach((block) => block.classList.remove('fault'));
  fault.badBlocks.forEach((name) => $(`[data-block="${name}"]`)?.classList.add('fault'));
  $('#globalStatus').textContent = powered ? fault.title : 'Monitor apagado';
  $('#globalStatusDetail').textContent = powered ? fault.detail : 'Simulación en reposo';
  $('#globalStatusDot').className = `status-dot ${powered ? (fault.severity === 'ok' ? '' : fault.severity) : 'danger'}`;
  $('#faultCard').innerHTML = `<h3>Diagnóstico: ${fault.title}</h3><p>${fault.text}</p>`;
  $('#voltageValue').textContent = powered ? fault.values[0] : '0.0 V';
  $('#hFreqValue').textContent = powered ? fault.values[1] : '0 kHz';
  $('#vFreqValue').textContent = powered ? fault.values[2] : '0 Hz';
  updateScreen();
}

$('#playButton').addEventListener('click', () => {
  if (timer) return stopAnimation();
  setStep(currentStep + 1);
  timer = setInterval(() => setStep(currentStep + 1), 2200);
  $('#playButton').textContent = '⏸ Pausar flujo';
});
$('#stepButton').addEventListener('click', () => { stopAnimation(); setStep(currentStep + 1); });
$('#resetButton').addEventListener('click', () => { stopAnimation(); currentStep = -1; $$('.active').forEach((node) => node.classList.remove('active')); $('#animationLabel').textContent = 'Flujo detenido'; $('#faultMode').value = 'none'; updateFault(); });
$('#powerButton').addEventListener('click', () => { powered = !powered; $('#powerButton').textContent = powered ? '⏻ Encendido' : '⏻ Apagado'; $('#powerButton').setAttribute('aria-pressed', String(powered)); updateFault(); });
['inputSignal', 'brightness', 'contrast', 'colorTemp', 'faultMode'].forEach((id) => $(`#${id}`).addEventListener('input', updateFault));

renderTimeline();
updateFault();
