const glossary = {
  ADC: 'Conversor analógico-digital. Convierte señales analógicas, como VGA, en datos digitales para el scaler.',
  DP: 'DisplayPort. Interfaz digital de vídeo y audio usada en monitores modernos.',
  EDID: 'Datos que el monitor entrega a la fuente de vídeo para informar de resoluciones, frecuencias y capacidades soportadas.',
  EMI: 'Interferencia electromagnética. El filtro EMI reduce ruido conducido entre la red eléctrica y la fuente.',
  ESR: 'Resistencia serie equivalente de un condensador. Si sube, aumenta el rizado y aparecen fallos de arranque o parpadeo.',
  HDMI: 'Interfaz multimedia de alta definición. Transporta vídeo digital, audio y datos auxiliares.',
  'I²C': 'Bus serie de control usado para comunicar microcontrolador, memorias EDID, sensores y circuitos auxiliares.',
  LCD: 'Pantalla de cristal líquido. Modula la luz de fondo mediante subpíxeles y filtros de color.',
  LED: 'Diodo emisor de luz. En monitores LCD suele formar la retroiluminación del panel.',
  LVDS: 'Señalización diferencial de baja tensión. En muchos monitores transporta vídeo desde la placa main a la T-CON.',
  OSD: 'On-Screen Display. Menú o información superpuesta generada por la placa main.',
  PFC: 'Corrección del factor de potencia. Etapa de fuente que mejora el consumo de red y estabiliza el bus primario.',
  PWM: 'Modulación por ancho de pulso. Técnica habitual para regular brillo de la retroiluminación LED.',
  RGB: 'Modelo de color rojo, verde y azul usado por subpíxeles del panel para formar la imagen.',
  SMPS: 'Fuente conmutada. Convierte la entrada de red en tensiones continuas reguladas para los bloques del monitor.',
  Scaler: 'Procesador de vídeo que adapta resolución, frecuencia y formato de la señal de entrada al panel.',
  'T-CON': 'Timing Controller. Placa que recibe vídeo LVDS/eDP y genera las señales temporizadas para filas y columnas del panel.',
  TFT: 'Transistor de película fina. Cada subpíxel LCD se controla con transistores integrados en la matriz activa.',
  eDP: 'Embedded DisplayPort. Enlace digital interno usado entre placa main/T-CON y panel en equipos recientes.'
};

const steps = [
  { title: '1. Alimentación', text: 'La red AC se filtra y la fuente conmutada genera tensiones de stand-by, lógica y potencia.', blocks: ['ac', 'psu'], links: ['ac-psu'] },
  { title: '2. Procesado de vídeo', text: 'La placa main detecta la entrada, lee EDID, escala la imagen y genera OSD.', blocks: ['input', 'main', 'mcu'], links: ['input-main', 'keys-mcu', 'mcu-main', 'psu-main'] },
  { title: '3. Temporización', text: 'La señal LVDS/eDP llega a la T-CON, que reparte datos a drivers de filas y columnas.', blocks: ['main', 'tcon'], links: ['main-tcon'] },
  { title: '4. Iluminación', text: 'El driver LED regula corriente y PWM según el brillo pedido y las protecciones.', blocks: ['psu', 'backlight', 'mcu'], links: ['psu-backlight', 'main-backlight'] },
  { title: '5. Imagen visible', text: 'El panel modula la luz de fondo con los subpíxeles RGB para formar la imagen.', blocks: ['tcon', 'backlight', 'panel'], links: ['tcon-panel', 'backlight-panel'] }
];

const faults = {
  none: {
    title: 'Monitor operativo',
    detail: 'Señales dentro de rango',
    severity: 'ok',
    text: 'Sin avería: comprueba la cadena completa siguiendo los puntos de test de cada bloque.',
    repairTitle: 'Mantenimiento preventivo recomendado',
    repair: [
      'Limpiar polvo de rejillas, fuente y placa main con el equipo desconectado.',
      'Verificar visualmente condensadores abombados, conectores flojos y zonas recalentadas.',
      'Registrar tensiones correctas de referencia para comparar cuando aparezca una avería real.'
    ],
    tools: ['Multímetro', 'Osciloscopio', 'Lupa', 'Aire/cepillo antiestático'],
    badBlocks: [],
    values: ['12.0 V', '67.5 kHz', '60 Hz']
  },
  'no-power': {
    title: 'Sin alimentación',
    detail: 'No hay 12 V en la salida de fuente',
    severity: 'danger',
    text: 'Síntoma: LED de stand-by apagado. Revisar fusible, puente rectificador, MOSFET primario, PWM y optoacoplador.',
    repairTitle: 'Reparación sugerida de la fuente',
    repair: [
      'Desconectar de la red y descargar el condensador primario antes de manipular la fuente.',
      'Comprobar fusible, NTC, puente rectificador y MOSFET; si el fusible está abierto, buscar cortos antes de sustituirlo.',
      'Medir Vcc del integrado PWM y revisar resistencias de arranque, optoacoplador y TL431/regulación secundaria.',
      'Sustituir componentes dañados por equivalentes de misma tensión, corriente, temperatura y aislamiento; probar con lámpara serie o limitador.'
    ],
    tools: ['Multímetro', 'Lámpara serie', 'Soldador', 'ESR meter'],
    badBlocks: ['psu'],
    values: ['0.0 V', '0 kHz', '0 Hz']
  },
  'no-backlight': {
    title: 'Imagen muy oscura',
    detail: 'Vídeo presente sin retroiluminación',
    severity: 'warning',
    text: 'Síntoma: se aprecia imagen con linterna. Medir enable BL_ON, PWM_DIM, cadena LED y driver de corriente.',
    repairTitle: 'Reparación del sistema de retroiluminación',
    repair: [
      'Confirmar con una linterna que hay imagen en el LCD y que el fallo se limita al backlight.',
      'Medir BL_ON y PWM_DIM desde la placa main; si faltan, revisar main/scaler antes del driver LED.',
      'Probar tiras LED con tester específico y sustituir tiras abiertas o con LED en cortocircuito por juegos completos equilibrados.',
      'Revisar MOSFET, diodo rápido, bobina y resistencias de sensado del driver; comprobar aislamiento del cableado al panel.'
    ],
    tools: ['Tester LED', 'Multímetro', 'Fuente limitada', 'Ventosas/útiles de apertura'],
    badBlocks: ['backlight'],
    values: ['12.0 V', '67.5 kHz', '60 Hz']
  },
  'bad-sync': {
    title: 'Pérdida de sincronismo',
    detail: 'Frecuencias fuera de captura',
    severity: 'warning',
    text: 'Síntoma: imagen desplazada o rodando. Verificar reloj de píxel, cable, conector, scaler y modo de entrada.',
    repairTitle: 'Reparación de entrada y sincronismos',
    repair: [
      'Probar otra fuente de vídeo, otro cable y otra entrada para separar fallo externo de fallo interno.',
      'Inspeccionar y resoldar conectores HDMI/VGA/DP con pines flojos, hundidos u oxidados.',
      'Verificar líneas DDC/EDID, reloj de píxel y alimentación de 5 V del puerto; sustituir protección ESD dañada si carga la línea.',
      'Actualizar firmware o regrabar EEPROM/EDID solo si las medidas eléctricas son correctas y el fallo persiste.'
    ],
    tools: ['Generador de patrones', 'Osciloscopio', 'Multímetro', 'Estación de soldadura fina'],
    badBlocks: ['input', 'main'],
    values: ['12.0 V', '41.2 kHz', '48 Hz']
  },
  tcon: {
    title: 'Fallo T-CON/LVDS',
    detail: 'Columnas o bandas verticales',
    severity: 'danger',
    text: 'Síntoma: franjas, media pantalla o solarización. Revisar fusibles SMD, VGH/VGL/AVDD, flex y gamma.',
    repairTitle: 'Reparación de T-CON y panel',
    repair: [
      'Reasentar cables LVDS/eDP y flex del panel; limpiar contactos con producto adecuado y revisar pestañas de fijación.',
      'Medir fusible SMD de T-CON y tensiones AVDD, VGH, VGL, VCOM y gamma; si falta una tensión, localizar corto antes de puentear.',
      'Sustituir conversores DC-DC, reguladores gamma o la T-CON completa cuando las tensiones no se estabilizan.',
      'Si las bandas cambian al presionar el marco o flex COF, explicar que suele ser fallo de panel y la reparación práctica es sustituir panel.'
    ],
    tools: ['Multímetro con puntas finas', 'Osciloscopio', 'Lupa', 'Limpiador de contactos'],
    badBlocks: ['tcon', 'panel'],
    values: ['12.0 V', '67.5 kHz', '60 Hz']
  },
  capacitors: {
    title: 'Rizado en fuente',
    detail: 'ESR alta provoca parpadeo',
    severity: 'warning',
    text: 'Síntoma: arranque intermitente o brillo pulsante. Medir rizado con osciloscopio y sustituir electrolíticos degradados.',
    repairTitle: 'Reparación por condensadores degradados',
    repair: [
      'Medir rizado en salidas de 5/12/24 V con carga; un rizado elevado orienta a condensadores con ESR alta.',
      'Sustituir electrolíticos del secundario por modelos low ESR, 105 °C y tensión igual o superior.',
      'Revisar soldaduras frías en transformador, bobinas, conectores y componentes que trabajan calientes.',
      'Después de reparar, comprobar arranque en frío, estabilidad térmica y rizado residual con osciloscopio.'
    ],
    tools: ['Osciloscopio', 'ESR meter', 'Soldador', 'Carga de prueba'],
    badBlocks: ['psu'],
    values: ['10.8–12.4 V', '67.5 kHz', '60 Hz']
  }
};


function escapeHTML(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}

function enhanceTerms(value) {
  let html = escapeHTML(value);
  Object.keys(glossary)
    .sort((a, b) => b.length - a.length)
    .forEach((term) => {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`\\b${escapedTerm}\\b`, 'g'), `<span class="term" data-term="${term}" tabindex="0">${term}</span>`);
    });
  return html;
}

function hydrateGlossaryTerms(root = document) {
  root.querySelectorAll('.term').forEach((node) => {
    const term = node.dataset.term;
    const definition = glossary[term];
    if (!definition) return;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `${term}: ${definition}`);
    node.setAttribute('data-definition', definition);
    node.setAttribute('title', definition);
  });
}

function renderGlossary() {
  $('#glossaryList').innerHTML = Object.entries(glossary)
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([term, definition]) => `<article><h3>${term}</h3><p>${definition}</p></article>`)
    .join('');
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let currentStep = -1;
let timer = null;
let powered = true;

function renderTimeline() {
  $('#timeline').innerHTML = steps.map((step, index) => `<li data-step="${index}"><strong>${step.title}</strong><p>${enhanceTerms(step.text)}</p></li>`).join('');
  hydrateGlossaryTerms($('#timeline'));
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
  const hasMainPower = powered && fault !== 'no-power';

  pattern.className = `video-pattern ${signal}`;
  screen.style.setProperty('--brightness', hasMainPower ? brightness / 100 : 0);
  screen.style.setProperty('--contrast', 0.65 + contrast / 100);
  screen.className = `screen ${hasMainPower ? '' : 'off'} ${fault !== 'none' ? fault : ''}`;
  screen.style.backgroundColor = temp === 'warm' ? '#1b120d' : temp === 'cool' ? '#071525' : '#05070d';
  $('#brightnessOutput').textContent = `${brightness}%`;
  $('#contrastOutput').textContent = `${contrast}%`;
  $('#backlightValue').textContent = fault === 'no-backlight' || !hasMainPower ? '0%' : `${brightness}%`;
  $('#osd').textContent = hasMainPower ? `${signal.toUpperCase()} · 1080p · ${fault === 'bad-sync' ? '48 Hz' : '60 Hz'}` : (powered ? 'Sin alimentación principal' : 'Sin stand-by');
}

function updateFault() {
  const key = powered ? $('#faultMode').value : 'no-power';
  const fault = faults[key];
  $$('.block').forEach((block) => block.classList.remove('fault'));
  fault.badBlocks.forEach((name) => $(`[data-block="${name}"]`)?.classList.add('fault'));
  $('#globalStatus').textContent = powered ? fault.title : 'Monitor apagado';
  $('#globalStatusDetail').textContent = powered ? fault.detail : 'Simulación en reposo';
  $('#globalStatusDot').className = `status-dot ${powered ? (fault.severity === 'ok' ? '' : fault.severity) : 'danger'}`;
  $('#faultCard').innerHTML = `
    <h3>Diagnóstico: ${fault.title}</h3>
    <p>${enhanceTerms(fault.text)}</p>
    <div class="repair-panel">
      <h4>${fault.repairTitle}</h4>
      <ol>${fault.repair.map((item) => `<li>${enhanceTerms(item)}</li>`).join('')}</ol>
      <p class="tools"><strong>Instrumentación:</strong> ${fault.tools.join(' · ')}</p>
      <p class="safety">⚠ Seguridad: trabajar sin tensión cuando se sustituya un componente y extremar precauciones en primario de fuente y condensadores cargados.</p>
    </div>`;
  hydrateGlossaryTerms($('#faultCard'));
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

renderGlossary();
hydrateGlossaryTerms();
renderTimeline();
updateFault();
