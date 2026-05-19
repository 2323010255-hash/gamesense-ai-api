// ── API URL ───────────────────────────────────────────────────────────
const API_URL = window.location.origin + '/predict';

// ── Datos de engagement ───────────────────────────────────────────────
const COLORS = {
  Low:    'var(--low)',
  Medium: 'var(--med)',
  High:   'var(--high)',
};

const BADGE_BG = {
  Low:    { bg: 'var(--low-bg)',  border: 'rgba(220,38,38,0.25)',   color: 'var(--low)' },
  Medium: { bg: 'var(--med-bg)',  border: 'rgba(217,119,6,0.25)',   color: 'var(--med)' },
  High:   { bg: 'var(--high-bg)', border: 'rgba(5,150,105,0.25)',   color: 'var(--high)' },
};

const DESCS = {
  Low:    'El jugador muestra bajo nivel de compromiso. Se recomienda implementar estrategias de re-engagement.',
  Medium: 'El jugador presenta un nivel de compromiso moderado. Existe potencial para incrementar la fidelización.',
  High:   'El jugador muestra un alto nivel de compromiso. Perfil idóneo para programas de retención premium.',
};

// ── Theme toggle ──────────────────────────────────────────────────────
const htmlEl   = document.documentElement;
const btnTheme = document.getElementById('theme-toggle');
const iconSun  = document.getElementById('icon-sun');
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
    iconSun.style.display  = 'none';
    iconMoon.style.display = 'block';
  } else {
    iconSun.style.display  = 'block';
    iconMoon.style.display = 'none';
  }
}

// ── Sincronizar sliders ↔ inputs numéricos ────────────────────────────
const pairs = [
  ['r-hours',        'v-hours'],
  ['r-sessions',     'v-sessions'],
  ['r-duration',     'v-duration'],
  ['r-level',        'v-level'],
  ['r-achievements', 'v-achievements'],
];

pairs.forEach(([rid, vid]) => {
  const range = document.getElementById(rid);
  const val   = document.getElementById(vid);
  if (!range || !val) return;

  range.addEventListener('input', () => {
    val.value = range.value;
    updateTrack(range);
  });

  val.addEventListener('change', () => {
    let v = parseFloat(val.value);
    v = Math.max(parseFloat(range.min), Math.min(parseFloat(range.max), v));
    val.value   = v;
    range.value = v;
    updateTrack(range);
  });

  updateTrack(range);
});

function updateTrack(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.background =
    `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`;
}

// ── Llamada a la API ──────────────────────────────────────────────────
async function runPrediction() {
  const btn    = document.getElementById('btn-predict');
  const status = document.getElementById('status-bar');
  if (!btn || !status) return;

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Analizando...';
  status.style.color = 'var(--med)';
  status.textContent = 'Ejecutando modelo CatBoost...';

  const payload = {
    play_time_hours:              parseFloat(document.getElementById('r-hours').value),
    sessions_per_week:            parseInt(document.getElementById('r-sessions').value),
    avg_session_duration_minutes: parseInt(document.getElementById('r-duration').value),
    player_level:                 parseInt(document.getElementById('r-level').value),
    achievements_unlocked:        parseInt(document.getElementById('r-achievements').value),
  };

  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
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
    btn.disabled  = false;
    btn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      Analizar Jugador`;
  }
}

// ── Actualizar UI con resultado ───────────────────────────────────────
function updateResult(data, payload) {
  const label = data.label;
  const probs = data.probabilities;
  const color = COLORS[label];
  const style = BADGE_BG[label];

  // Caja principal
  const box = document.getElementById('result-box');
  if (box) {
    box.style.borderColor = color;
    box.style.boxShadow   = `0 0 0 4px ${style.bg}`;
    box.style.transform   = 'scale(1.015)';
    setTimeout(() => { box.style.transform = 'scale(1)'; }, 220);
  }

  // Badge
  const badge = document.getElementById('result-badge');
  if (badge) {
    badge.textContent       = label.toUpperCase();
    badge.style.color       = style.color;
    badge.style.background  = style.bg;
    badge.style.borderColor = style.border;
  }

  // Label y descripción
  const lbl  = document.getElementById('result-label');
  const desc = document.getElementById('result-desc');
  if (lbl)  { lbl.textContent  = label.toUpperCase(); lbl.style.color = color; }
  if (desc) { desc.textContent = DESCS[label]; desc.style.color = 'var(--text-subtle)'; }

  // Barras de probabilidad
  setBar('low',  probs.Low    ?? 0);
  setBar('med',  probs.Medium ?? 0);
  setBar('high', probs.High   ?? 0);

  // Resumen de valores
  const safe = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  safe('inf-hours',        payload.play_time_hours + ' h');
  safe('inf-sessions',     payload.sessions_per_week);
  safe('inf-duration',     payload.avg_session_duration_minutes + ' min');
  safe('inf-level',        payload.player_level);
  safe('inf-achievements', payload.achievements_unlocked);
}

function setBar(id, pct) {
  const pctEl = document.getElementById(`pct-${id}`);
  const barEl = document.getElementById(`bar-${id}`);
  if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
  if (barEl) barEl.style.width = pct + '%';
}

// ── Toast ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = type === 'error' ? 'var(--low)' : 'var(--accent)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ── Enter para predecir ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const btn = document.getElementById('btn-predict');
  if (e.key === 'Enter' && btn && !btn.disabled) runPrediction();
});
