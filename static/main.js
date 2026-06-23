// ── API URLs ──────────────────────────────────────────────────────────
const API_URL = window.location.origin + '/predict';
const API_BATCH_URL = window.location.origin + '/predict/batch';

// ── Datos de engagement ───────────────────────────────────────────────
const COLORS = {
  Low: 'var(--low)',
  Medium: 'var(--med)',
  High: 'var(--high)',
};

const BADGE_BG = {
  Low: { bg: 'var(--low-bg)', border: 'rgba(220,38,38,0.25)', color: 'var(--low)' },
  Medium: { bg: 'var(--med-bg)', border: 'rgba(217,119,6,0.25)', color: 'var(--med)' },
  High: { bg: 'var(--high-bg)', border: 'rgba(5,150,105,0.25)', color: 'var(--high)' },
};

const DESCS = {
  Low: 'Riesgo de abandono (Churn). Se sugiere activar bonos de regreso y ofertas personalizadas para incentivar su retorno.',
  Medium: 'JJugador regular. Juega de manera constante, pero se le puede motivar a jugar con mayor frecuencia mediante eventos especiales o invitaciones para jugar con amigos.',
  High: 'Usuario altamente fidelizado y de gran valor. Candidato ideal para pases de batalla premium o programas VIP.',
};

// ══════════════════════════════════════════════════════════════════════
//  THEME TOGGLE
// ══════════════════════════════════════════════════════════════════════
const htmlEl = document.documentElement;
const btnTheme = document.getElementById('theme-toggle');
const iconSun = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');

// Restaurar preferencia guardada (por defecto: light)
const savedTheme = localStorage.getItem('gs-theme') || 'light';
applyTheme(savedTheme);

btnTheme.addEventListener('click', () => {
  const next = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('gs-theme', next);
});

function applyTheme(theme) {
  htmlEl.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    iconSun.style.display = 'none';
    iconMoon.style.display = 'block';
  } else {
    iconSun.style.display = 'block';
    iconMoon.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ══════════════════════════════════════════════════════════════════════
function switchTab(tab) {
  document.getElementById('panel-individual').style.display =
    tab === 'individual' ? '' : 'none';
  document.getElementById('panel-dataset').style.display =
    tab === 'dataset' ? '' : 'none';
  const panelAb = document.getElementById('panel-ab');
  if (panelAb) panelAb.style.display = tab === 'ab' ? '' : 'none';

  document.getElementById('tab-btn-individual')
    .classList.toggle('active', tab === 'individual');
  document.getElementById('tab-btn-dataset')
    .classList.toggle('active', tab === 'dataset');
  const btnAb = document.getElementById('tab-btn-ab');
  if (btnAb) btnAb.classList.toggle('active', tab === 'ab');
}

// ══════════════════════════════════════════════════════════════════════
//  INDIVIDUAL ANALYSIS — sliders
// ══════════════════════════════════════════════════════════════════════
const pairs = [
  ['r-hours', 'v-hours'],
  ['r-sessions', 'v-sessions'],
  ['r-duration', 'v-duration'],
  ['r-level', 'v-level'],
  ['r-achievements', 'v-achievements'],
];

pairs.forEach(([rid, vid]) => {
  const range = document.getElementById(rid);
  const val = document.getElementById(vid);
  if (!range || !val) return;

  range.addEventListener('input', () => {
    val.value = range.value;
    updateTrack(range);
  });

  val.addEventListener('change', () => {
    let v = parseFloat(val.value);
    v = Math.max(parseFloat(range.min), Math.min(parseFloat(range.max), v));
    val.value = v;
    range.value = v;
    updateTrack(range);
  });

  updateTrack(range);
});

// Toggle InGamePurchases
const togglePurchases = document.getElementById('toggle-purchases');
const purchasesLabel  = document.getElementById('purchases-label');
if (togglePurchases && purchasesLabel) {
  togglePurchases.addEventListener('change', () => {
    purchasesLabel.textContent = togglePurchases.checked ? 'Sí' : 'No';
    purchasesLabel.style.color = togglePurchases.checked ? 'var(--high)' : 'var(--text-subtle)';
  });
}

function updateTrack(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.background =
    `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`;
}

// ══════════════════════════════════════════════════════════════════════
//  INDIVIDUAL ANALYSIS — API call
// ══════════════════════════════════════════════════════════════════════
async function runPrediction() {
  const btn = document.getElementById('btn-predict');
  const status = document.getElementById('status-bar');
  if (!btn || !status) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analizando...';
  status.style.color = 'var(--med)';
  status.textContent = 'Ejecutando modelo CatBoost...';

  const payload = {
    play_time_hours: parseFloat(document.getElementById('r-hours').value),
    in_game_purchases: document.getElementById('toggle-purchases')?.checked ? 1 : 0,
    sessions_per_week: parseInt(document.getElementById('r-sessions').value),
    avg_session_duration_minutes: parseInt(document.getElementById('r-duration').value),
    player_level: parseInt(document.getElementById('r-level').value),
    achievements_unlocked: parseInt(document.getElementById('r-achievements').value),
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    updateResult(data, payload);

    status.style.color = 'var(--high)';
    status.textContent = 'Análisis completado';
  } catch (e) {
    status.style.color = 'var(--low)';
    status.textContent = `Error: ${e.message}`;
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      Analizar Jugador`;
  }
}

// ── Actualizar UI con resultado (individual) ──────────────────────────
function updateResult(data, payload) {
  const label = data.label;
  const probs = data.probabilities;
  const color = COLORS[label];
  const style = BADGE_BG[label];

  // Caja principal
  const box = document.getElementById('result-box');
  if (box) {
    box.style.borderColor = color;
    box.style.boxShadow = `0 0 0 4px ${style.bg}`;
    box.style.transform = 'scale(1.015)';
    setTimeout(() => { box.style.transform = 'scale(1)'; }, 220);
  }

  // Badge
  const badge = document.getElementById('result-badge');
  if (badge) {
    badge.textContent = label.toUpperCase();
    badge.style.color = style.color;
    badge.style.background = style.bg;
    badge.style.borderColor = style.border;
  }

  // Label y descripción
  const lbl = document.getElementById('result-label');
  const desc = document.getElementById('result-desc');
  if (lbl) { lbl.textContent = label.toUpperCase(); lbl.style.color = color; }
  if (desc) { desc.textContent = DESCS[label]; desc.style.color = 'var(--text-subtle)'; }

  // Barras de probabilidad
  setBar('low', probs.Low ?? 0);
  setBar('med', probs.Medium ?? 0);
  setBar('high', probs.High ?? 0);

  // Resumen de valores
  const safe = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  safe('inf-hours', payload.play_time_hours + ' h');
  safe('inf-purchases', payload.in_game_purchases === 1 ? 'Sí' : 'No');
  safe('inf-sessions', payload.sessions_per_week);
  safe('inf-duration', payload.avg_session_duration_minutes + ' min');
  safe('inf-level', payload.player_level);
  safe('inf-achievements', payload.achievements_unlocked);
}

function setBar(id, pct) {
  const pctEl = document.getElementById(`pct-${id}`);
  const barEl = document.getElementById(`bar-${id}`);
  if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
  if (barEl) barEl.style.width = pct + '%';
}

// ══════════════════════════════════════════════════════════════════════
//  DATASET ANALYSIS — file upload
// ══════════════════════════════════════════════════════════════════════
let selectedFile = null;
let currentBatchData = null;

const dropzone = document.getElementById('dropzone');

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', e => {
  if (!dropzone.contains(e.relatedTarget)) {
    dropzone.classList.remove('dragover');
  }
});

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('file-input').files = dt.files;
    } catch (_) { }
    setSelectedFile(file);
  }
});

function onFileSelected(input) {
  const file = input.files[0];
  if (!file) return;
  setSelectedFile(file);
}

function setSelectedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    showToast('Formato no soportado. Usa CSV, XLSX o XLS.', 'error');
    return;
  }

  selectedFile = file;
  const sizeStr = file.size < 1024 * 1024
    ? (file.size / 1024).toFixed(1) + ' KB'
    : (file.size / 1024 / 1024).toFixed(2) + ' MB';

  const nameEl = document.getElementById('file-info-name');
  if (nameEl) nameEl.textContent = `${file.name}  ·  ${sizeStr}`;

  document.getElementById('file-info').style.display = 'flex';
  dropzone.style.display = 'none';
  document.getElementById('btn-batch').disabled = false;

  const status = document.getElementById('batch-status');
  status.style.color = 'var(--high)';
  status.textContent = 'Analizar Dataset';
}

function removeFile() {
  selectedFile = null;
  const inp = document.getElementById('file-input');
  if (inp) inp.value = '';
  document.getElementById('file-info').style.display = 'none';
  dropzone.style.display = 'flex';
  document.getElementById('btn-batch').disabled = true;

  const status = document.getElementById('batch-status');
  status.style.color = 'var(--text-muted)';
  status.textContent = 'Selecciona un archivo para comenzar';
}

// ══════════════════════════════════════════════════════════════════════
//  DATASET ANALYSIS — batch API call
// ══════════════════════════════════════════════════════════════════════
async function runBatchPrediction() {
  if (!selectedFile) return;

  const btn = document.getElementById('btn-batch');
  const status = document.getElementById('batch-status');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analizando dataset...';
  status.style.color = 'var(--med)';
  status.textContent = 'Procesando jugadores con CatBoost...';

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const res = await fetch(API_BATCH_URL, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    renderBatchResults(data);

    status.style.color = 'var(--high)';
    status.textContent = `${data.total.toLocaleString()} jugadores analizados`;
  } catch (e) {
    status.style.color = 'var(--low)';
    status.textContent = `Error: ${e.message}`;
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
      Analizar Dataset`;
  }
}

// ══════════════════════════════════════════════════════════════════════
//  DATASET ANALYSIS — render results
// ══════════════════════════════════════════════════════════════════════
function renderBatchResults(data) {
  const { total, discarded, distribution, percentages, averages, sample } = data;
  currentBatchData = data;

  // Meta
  let meta = `${total.toLocaleString()} jugadores analizados`;
  if (discarded > 0) {
    const s = discarded !== 1 ? 's' : '';
    meta += `  ·  ${discarded} fila${s} descartada${s}`;
  }
  const metaEl = document.getElementById('batch-meta');
  if (metaEl) metaEl.textContent = meta;

  // Actualizar UI
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // Bar chart labels
  safe('bpct-low', percentages.Low.toFixed(1) + '%');
  safe('bpct-med', percentages.Medium.toFixed(1) + '%');
  safe('bpct-high', percentages.High.toFixed(1) + '%');

  // Bar chart counts
  safe('bcount-low', distribution.Low.toLocaleString() + ' jug.');
  safe('bcount-med', distribution.Medium.toLocaleString() + ' jug.');
  safe('bcount-high', distribution.High.toLocaleString() + ' jug.');

  // Animate bars — reset first, then set
  ['bfill-low', 'bfill-med', 'bfill-high'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.height = '0%';
  });
  setTimeout(() => {
    const fillLow = document.getElementById('bfill-low');
    const fillMed = document.getElementById('bfill-med');
    const fillHigh = document.getElementById('bfill-high');
    if (fillLow) fillLow.style.height = Math.max(percentages.Low, 2) + '%';
    if (fillMed) fillMed.style.height = Math.max(percentages.Medium, 2) + '%';
    if (fillHigh) fillHigh.style.height = Math.max(percentages.High, 2) + '%';
  }, 150);

  // Averages table
  const featureLabels = {
    PlayTimeHours: 'Horas de Juego',
    InGamePurchases: 'Compras en el Juego',
    SessionsPerWeek: 'Sesiones por Semana',
    AvgSessionDurationMinutes: 'Duración Promedio (min)',
    PlayerLevel: 'Nivel del Jugador',
    AchievementsUnlocked: 'Logros Desbloqueados',
  };

  const tbody = document.getElementById('avg-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    for (const [key, val] of Object.entries(averages)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${featureLabels[key] || key}</td><td>${val.toLocaleString()}</td>`;
      tbody.appendChild(tr);
    }
  }

  // Recomendaciones
  const recText = document.getElementById('rec-text');
  if (recText) {
    if (percentages.Low > 50) {
      recText.textContent = "Alerta Crítica: Más del 50% de los jugadores presenta bajo compromiso. Se sugiere implementar un programa agresivo de re-engagement con notificaciones push personalizadas, bonos de regreso y eventos de fin de semana para evitar una alta tasa de abandono.";
    } else if (percentages.High > 50) {
      recText.textContent = "Segmento VIP dominante: Existe una base de jugadores altamente comprometida. Es un momento adecuado para implementar estrategias de monetización como contenido premium, beneficios exclusivos o sistemas de recompensas especiales.";
    } else if (percentages.Low > 35 && percentages.High > 35) {
      recText.textContent = "Base de jugadores Segmentada: Existen grupos numerosos tanto de bajo como de alto nivel de compromiso. Se recomienda segmentar las estrategias de comunicación y participación, ofreciendo incentivos de regreso para jugadores menos activos y actividades competitivas o desafíos para los más comprometidos.";
    } else if (percentages.Medium > 50) {
      recText.textContent = "Oportunidad de Crecimiento: La mayoría está en nivel medio. Implementar un sistema de misiones consecutivas o gremios puede ser el empujón necesario para convertirlos en 'High'.";
    } else {
      recText.textContent = "Distribución Equilibrada: La base de jugadores presenta un comportamiento sano. Mantén el calendario de actualizaciones regular y monitorea el impacto de los próximos eventos.";
    }
  }

  // Insight Clave
  const insightBox = document.getElementById('rec-insight-box');
  const insightText = document.getElementById('rec-insight-text');
  if (insightBox && insightText && data.key_insight) {
    insightBox.style.display = 'block';
    insightText.textContent = data.key_insight;
  } else if (insightBox) {
    insightBox.style.display = 'none';
  }

  // Ingresos en Riesgo
  const revAlert = document.getElementById('revenue-alert');
  const revText = document.getElementById('revenue-text');
  if (revAlert && revText && data.revenue_risk && data.revenue_risk > 0) {
    revAlert.style.display = 'flex';
    revText.textContent = "$" + data.revenue_risk.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (revAlert) {
    revAlert.style.display = 'none';
  }

  // Tabla de Muestra
  const sampleTbody = document.getElementById('sample-tbody');
  if (sampleTbody && sample) {
    sampleTbody.innerHTML = '';
    sample.forEach(row => {
      const tr = document.createElement('tr');
      const predClass = row.Prediction.toLowerCase();
      tr.innerHTML = `
        <td>${row.PlayTimeHours}</td>
        <td>${row.InGamePurchases === 1 ? 'Sí' : 'No'}</td>
        <td>${row.SessionsPerWeek}</td>
        <td>${row.AvgSessionDurationMinutes}</td>
        <td>${row.PlayerLevel}</td>
        <td>${row.AchievementsUnlocked}</td>
        <td><span class="badge-pred ${predClass}">${row.Prediction}</span></td>
      `;
      sampleTbody.appendChild(tr);
    });
  }

  // Show & scroll to results card
  const card = document.getElementById('batch-result-card');
  if (card) {
    card.style.display = '';
    card.style.animation = 'none';
    requestAnimationFrame(() => { card.style.animation = 'fadeUp 0.4s ease both'; });
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  A/B TESTING
// ══════════════════════════════════════════════════════════════════════

function onFileSelectedAB(type, input) {
  const file = input.files[0];
  const dzTitle = document.getElementById(`dropzone-title-${type}`);
  const dz = document.getElementById(`dropzone-${type}`);
  const formats = document.getElementById(`dropzone-formats-${type}`);
  const limit = document.getElementById(`dropzone-limit-${type}`);
  if (file) {
    dzTitle.textContent = file.name;
    dz.classList.add('has-file');
    if (formats) formats.style.display = 'none';
    if (limit) limit.style.display = 'none';
    checkABStatus();
  } else {
    dzTitle.textContent = 'Haz clic o arrastra archivo';
    dz.classList.remove('has-file');
    if (formats) formats.style.display = 'flex';
    if (limit) limit.style.display = 'block';
    checkABStatus();
  }
}

function checkABStatus() {
  const fA = document.getElementById('file-a').files[0];
  const fB = document.getElementById('file-b').files[0];
  const status = document.getElementById('ab-status');
  if (fA && fB) {
    status.style.color = 'var(--high)';
    status.textContent = 'Ambos archivos listos — presiona Ejecutar Comparativa';
  } else {
    status.style.color = 'var(--text-muted)';
    status.textContent = 'Selecciona ambos archivos para comenzar';
  }
}

async function runABComparison() {
  const fileA = document.getElementById('file-a').files[0];
  const fileB = document.getElementById('file-b').files[0];

  if (!fileA || !fileB) {
    showToast('Selecciona ambos archivos (A y B) para continuar', 'error');
    return;
  }

  const btn = document.getElementById('btn-ab');
  const status = document.getElementById('ab-status');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Procesando...';
  status.style.color = 'var(--med)';
  status.textContent = 'Llamando al modelo para ambos datasets...';

  try {
    const fdA = new FormData(); fdA.append('file', fileA);
    const fdB = new FormData(); fdB.append('file', fileB);

    const [resA, resB] = await Promise.all([
      fetch(API_BATCH_URL, { method: 'POST', body: fdA }),
      fetch(API_BATCH_URL, { method: 'POST', body: fdB })
    ]);

    if (!resA.ok || !resB.ok) throw new Error('Error procesando los archivos. Verifica el formato.');

    const dataA = await resA.json();
    const dataB = await resB.json();

    renderABResults(dataA, dataB);

    status.style.color = 'var(--high)';
    status.textContent = `Comparativa completada con éxito.`;
  } catch (e) {
    status.style.color = 'var(--low)';
    status.textContent = `Error: ${e.message}`;
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Ejecutar Comparativa
    `;
  }
}

function resetIndividualPanel() {
  document.getElementById('v-hours').value = 12;
  document.getElementById('v-sessions').value = 5;
  document.getElementById('v-duration').value = 45;
  document.getElementById('v-level').value = 10;
  document.getElementById('v-achievements').value = 5;

  const b = document.getElementById('result-badge');
  const l = document.getElementById('result-label');
  const d = document.getElementById('result-desc');

  if (b) { b.textContent = 'PENDIENTE'; b.className = 'result-badge'; }
  if (l) l.textContent = '—';
  if (d) d.innerHTML = 'Configure los parámetros del jugador<br/>y ejecute el análisis.';

  const box = document.getElementById('result-box');
  if (box) box.style.borderColor = 'var(--border)';

  ['low', 'med', 'high'].forEach(lbl => {
    const pct = document.getElementById(`pct-${lbl}`);
    const bar = document.getElementById(`bar-${lbl}`);
    if (pct) pct.textContent = '—';
    if (bar) bar.style.width = '0%';
  });

  showToast('Valores restablecidos', 'info');
}

function renderABResults(dataA, dataB) {
  const card = document.getElementById('ab-result-card');
  if (card) {
    card.style.display = '';
    card.style.animation = 'none';
    requestAnimationFrame(() => { card.style.animation = 'fadeUp 0.4s ease both'; });
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
  }

  document.getElementById('ab-meta').textContent = `${dataA.total.toLocaleString()} vs ${dataB.total.toLocaleString()} jugadores`;

  document.getElementById('ab-chart-a').innerHTML = generateBarChartHTML(dataA.percentages, dataA.distribution);
  document.getElementById('ab-chart-b').innerHTML = generateBarChartHTML(dataB.percentages, dataB.distribution);

  const diffHigh = dataB.percentages.High - dataA.percentages.High;
  const diffLow = dataB.percentages.Low - dataA.percentages.Low;

  const conclusionEl = document.getElementById('ab-conclusion');
  const suggestionEl = document.getElementById('ab-suggestion');
  const iconEl = document.getElementById('ab-rec-icon');

  if (diffHigh > 2) {
    conclusionEl.textContent = `Éxito: El Engagement Alto aumentó un ${diffHigh.toFixed(1)}% en la Variante B.`;
    conclusionEl.style.color = 'var(--high)';
    iconEl.style.color = 'var(--high)';
    suggestionEl.innerHTML = `<strong>Acción Recomendada:</strong> Los cambios implementados en la Variante B están funcionando de maravilla. Considera desplegar este parche o actualización a toda la base de jugadores. Es el momento perfecto para introducir nuevas opciones de monetización, ya que el interés general del público ha subido de forma tangible.`;
  } else if (diffLow > 2) {
    conclusionEl.textContent = `Alerta: El Bajo Compromiso aumentó un ${diffLow.toFixed(1)}% en la Variante B. Cuidado con los cambios.`;
    conclusionEl.style.color = 'var(--low)';
    iconEl.style.color = 'var(--low)';
    suggestionEl.innerHTML = `<strong>Acción Recomendada:</strong> ¡Precaución! La nueva versión ha generado fricción o pérdida de interés en los usuarios. Analiza a fondo las mecánicas que fueron modificadas (como dificultad, recompensas o tiempos de espera). Se sugiere no publicar esta variante globalmente hasta encontrar y solucionar el problema que está causando que la gente abandone.`;
  } else {
    conclusionEl.textContent = `Neutral: No hay diferencias significativas (>2%) en el comportamiento de los jugadores.`;
    conclusionEl.style.color = 'var(--text)';
    iconEl.style.color = 'var(--med)';
    suggestionEl.innerHTML = `<strong>Acción Recomendada:</strong> La Variante B no ha tenido ni un impacto negativo ni positivo en el interés de los jugadores. Si la actualización contenía cambios estéticos o de backend (como optimización de servidores), puedes proceder con seguridad. Si el objetivo era aumentar la retención, deberás iterar el diseño y probar mecánicas más atractivas en un futuro test.`;
  }
}

function generateBarChartHTML(pcts, dist) {
  return `
    <div class="bar-group">
      <div class="bar-header-wrap">
        <div class="bar-pct" style="color:var(--low)">${pcts.Low.toFixed(1)}%</div>
        <div class="bar-count">${dist.Low.toLocaleString()}</div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="background:var(--low);height:${Math.max(pcts.Low, 2)}%"></div>
      </div>
      <div class="bar-label">Low</div>
    </div>
    <div class="bar-group">
      <div class="bar-header-wrap">
        <div class="bar-pct" style="color:var(--med)">${pcts.Medium.toFixed(1)}%</div>
        <div class="bar-count">${dist.Medium.toLocaleString()}</div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="background:var(--med);height:${Math.max(pcts.Medium, 2)}%"></div>
      </div>
      <div class="bar-label">Medium</div>
    </div>
    <div class="bar-group">
      <div class="bar-header-wrap">
        <div class="bar-pct" style="color:var(--high)">${pcts.High.toFixed(1)}%</div>
        <div class="bar-count">${dist.High.toLocaleString()}</div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="background:var(--high);height:${Math.max(pcts.High, 2)}%"></div>
      </div>
      <div class="bar-label">High</div>
    </div>
  `;
}

function resetABPanel() {
  const fileA = document.getElementById('file-a');
  const fileB = document.getElementById('file-b');
  if (fileA) fileA.value = '';
  if (fileB) fileB.value = '';

  const dzTitleA = document.getElementById('dropzone-title-a');
  const dzTitleB = document.getElementById('dropzone-title-b');
  if (dzTitleA) dzTitleA.textContent = 'Haz clic o arrastra archivo';
  if (dzTitleB) dzTitleB.textContent = 'Haz clic o arrastra archivo';

  const dzA = document.getElementById('dropzone-a');
  const dzB = document.getElementById('dropzone-b');
  if (dzA) dzA.classList.remove('has-file');
  if (dzB) dzB.classList.remove('has-file');

  const formatsA = document.getElementById('dropzone-formats-a');
  const formatsB = document.getElementById('dropzone-formats-b');
  const limitA = document.getElementById('dropzone-limit-a');
  const limitB = document.getElementById('dropzone-limit-b');
  if (formatsA) formatsA.style.display = 'flex';
  if (formatsB) formatsB.style.display = 'flex';
  if (limitA) limitA.style.display = 'block';
  if (limitB) limitB.style.display = 'block';

  const card = document.getElementById('ab-result-card');
  if (card) card.style.display = 'none';

  const status = document.getElementById('ab-status');
  if (status) {
    status.textContent = 'Selecciona ambos archivos para comenzar';
    status.style.color = 'var(--text-muted)';
  }

  showToast('Panel de comparativa limpiado.', 'info');
}

// ══════════════════════════════════════════════════════════════════════
//  SHARED UTILITIES
// ══════════════════════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = type === 'error' ? 'var(--low)' : 'var(--accent)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// Enter → predecir (solo en tab individual)
document.addEventListener('keydown', e => {
  const btn = document.getElementById('btn-predict');
  const panelInd = document.getElementById('panel-individual');
  if (e.key === 'Enter' && btn && !btn.disabled && panelInd && panelInd.style.display !== 'none') {
    runPrediction();
  }
});

// ══════════════════════════════════════════════════════════════════════
//  EXPORT FUNCTIONS
// ══════════════════════════════════════════════════════════════════════
function resetBatchPanel() {
  removeFile(); // Esto resetea el archivo y la UI de subida

  const card = document.getElementById('batch-result-card');
  if (card) {
    card.style.display = 'none';
  }

  currentBatchData = null;
  showToast('Panel limpiado. Listo para un nuevo archivo.', 'info');
}

function exportToPDF() {
  if (!currentBatchData) {
    showToast('No hay datos para exportar', 'error');
    return;
  }
  const originalTitle = document.title;
  document.title = "Reporte_Analisis_Dataset_GameSense";
  window.print();
  document.title = originalTitle;
}

function exportABToPDF() {
  const card = document.getElementById('ab-result-card');
  if (!card || card.style.display === 'none') {
    showToast('No hay resultados A/B para exportar', 'error');
    return;
  }
  const originalTitle = document.title;
  document.title = "Reporte_Comparativa_AB_GameSense";
  window.print();
  document.title = originalTitle;
}

