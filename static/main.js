  // ── Dirección de la API (mismo servidor) ──────────────────────────────
  const API_URL = window.location.origin + '/predict';

  // ── Datos de engagement ───────────────────────────────────────────────
  const COLORS = { Low: 'var(--low)', Medium: 'var(--med)', High: 'var(--high)' };
  const ICONS  = { Low: '🔴', Medium: '🟡', High: '🟢' };
  const DESCS  = {
    Low:    'El jugador muestra poco compromiso.\nSe recomienda estrategias de re-engagement.',
    Medium: 'El jugador tiene un compromiso moderado.\nOportunidad de fidelización activa.',
    High:   'El jugador está muy comprometido.\n¡Excelente perfil para programas VIP!',
  };

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

    // Slider → número
    range.addEventListener('input', () => {
      val.value = range.value;
      updateTrack(range);
    });

    // Número → slider
    val.addEventListener('change', () => {
      let v = parseFloat(val.value);
      v = Math.max(parseFloat(range.min), Math.min(parseFloat(range.max), v));
      val.value   = v;
      range.value = v;
      updateTrack(range);
    });

    updateTrack(range);   // color inicial
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

    // UI → cargando
    btn.disabled   = true;
    btn.innerHTML  = '<span class="spinner"></span> Analizando...';
    status.style.color = 'var(--med)';
    status.textContent = '🔄 Ejecutando modelo...';

    const payload = {
      play_time_hours:              parseFloat(document.getElementById('r-hours').value),
      sessions_per_week:            parseInt(document.getElementById('r-sessions').value),
      avg_session_duration_minutes: parseInt(document.getElementById('r-duration').value),
      player_level:                 parseInt(document.getElementById('r-level').value),
      achievements_unlocked:        parseInt(document.getElementById('r-achievements').value),
    };

    try {
      const res  = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      updateResult(data, payload);

      status.style.color = 'var(--high)';
      status.textContent = '✅ Análisis completado';
    } catch (e) {
      status.style.color = 'var(--low)';
      status.textContent = `❌ Error: ${e.message}`;
      showToast(`❌ ${e.message}`, 'error');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = '🔍 Analizar Jugador';
    }
  }

  // ── Actualizar UI con resultado ───────────────────────────────────────
  function updateResult(data, payload) {
    const label = data.label;
    const probs = data.probabilities;
    const color = COLORS[label];

    // Caja principal
    const box = document.getElementById('result-box');
    box.style.borderColor = color;

    document.getElementById('result-icon').textContent  = ICONS[label];
    document.getElementById('result-label').textContent = label.toUpperCase();
    document.getElementById('result-label').style.color = color;
    document.getElementById('result-desc').textContent  = DESCS[label];
    document.getElementById('result-desc').style.color  = 'var(--text)';

    // Barras
    setBar('low',  probs.Low   ?? 0);
    setBar('med',  probs.Medium ?? 0);
    setBar('high', probs.High  ?? 0);

    // Resumen
    document.getElementById('inf-hours').textContent        = payload.play_time_hours + ' h';
    document.getElementById('inf-sessions').textContent     = payload.sessions_per_week;
    document.getElementById('inf-duration').textContent     = payload.avg_session_duration_minutes + ' min';
    document.getElementById('inf-level').textContent        = payload.player_level;
    document.getElementById('inf-achievements').textContent = payload.achievements_unlocked;

    // Animación de entrada en la caja
    box.style.transform = 'scale(1.02)';
    setTimeout(() => (box.style.transform = 'scale(1)'), 200);
  }

  function setBar(id, pct) {
    document.getElementById(`pct-${id}`).textContent  = pct.toFixed(1) + '%';
    document.getElementById(`bar-${id}`).style.width  = pct + '%';
  }

  // ── Toast helper ──────────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.borderColor = type === 'error' ? 'var(--low)' : 'var(--accent)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
  }

  // ── Enter para predecir ───────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !document.getElementById('btn-predict').disabled) {
      runPrediction();
    }
  });
