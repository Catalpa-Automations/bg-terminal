function fmtUsd(v) {
  if (v === null || v === undefined) return "--";
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function renderCurve(curve) {
  const svg = document.getElementById("pnl-chart");
  if (!curve || curve.length < 2) {
    svg.innerHTML = `<text x="20" y="95" fill="#8b949e" font-size="12">No closed trades yet</text>`;
    return;
  }
  const vals = curve.map(p => p.cum);
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const span = max - min || 1;
  const w = 600, h = 180, pad = 16;
  const pts = curve.map((p, i) => {
    const x = pad + (i / (curve.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((p.cum - min) / span) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const zeroY = (h - pad - ((0 - min) / span) * (h - 2 * pad)).toFixed(1);
  const color = vals[vals.length - 1] >= 0 ? "#3fb950" : "#f85149";
  svg.innerHTML = `
    <line x1="${pad}" y1="${zeroY}" x2="${w - pad}" y2="${zeroY}" stroke="#2d3748" stroke-dasharray="4 4"/>
    <polyline fill="none" stroke="${color}" stroke-width="2.5" points="${pts}"/>
  `;
}

function render(d) {
  const k = d.kpis;
  const dot = document.getElementById("status-dot");
  dot.className = "dot " + (d.live && d.trade_allowed && !d.orb_error ? "ok" : "bad");

  document.getElementById("mode-badge").textContent = `${d.mode || "OFF"} · ${d.phase.toUpperCase()}`;
  document.getElementById("last-run").textContent = `Updated: ${d.updated_utc}`;

  document.getElementById("k-bal").textContent = `$${k.balance.toFixed(2)} / $${k.equity.toFixed(2)}`;
  const netEl = document.getElementById("k-net");
  netEl.textContent = fmtUsd(k.net_pnl);
  netEl.className = "k-val " + (k.net_pnl >= 0 ? "pos" : "neg");

  document.getElementById("k-wr").textContent = `${k.win_rate}% (${k.wins}W/${k.losses}L)`;
  document.getElementById("k-pf").textContent = k.profit_factor.toFixed(2);
  document.getElementById("k-gap").textContent = `$${k.to_target.toFixed(2)}`;
  document.getElementById("k-daily").textContent = k.room_daily !== null ? `$${k.room_daily.toFixed(2)}` : "--";
  document.getElementById("k-trail").textContent = `$${k.room_trailing.toFixed(2)}`;

  const consEl = document.getElementById("k-cons");
  consEl.textContent = k.best_day_pct !== null ? `${k.best_day_pct}% (${k.consistency_met ? "OK" : "NOT MET"})` : "--";
  consEl.className = "k-val " + (k.consistency_met ? "pos" : "warn");

  document.getElementById("floor-line").textContent =
    `Daily floor: ${k.daily_floor !== null ? "$" + k.daily_floor.toFixed(2) : "--"} · Trailing floor: $${k.trailing_floor.toFixed(2)}`;
  document.getElementById("best-day-sub").textContent = k.best_day ? `Best: ${k.best_day}` : "--";
  document.getElementById("sum-age").textContent = d.summary_age_s !== null ? `Summary age: ${d.summary_age_s}s` : "--";
  document.getElementById("trades-count").textContent = `${k.total_trades} closed`;

  renderCurve(d.curve);

  document.getElementById("days-body").innerHTML = d.daily_accra.map(r =>
    `<tr><td>${r.day}</td><td class="${r.pnl >= 0 ? "pos" : "neg"}">${fmtUsd(r.pnl)}</td></tr>`
  ).join("") || `<tr><td colspan="2">No days logged</td></tr>`;

  const pills = [
    `LIVE: ${d.live}`,
    `AutoTrading: ${d.trade_allowed}`,
    `KILL: ${d.kill_file}`,
    `london_orb: $20 risk`,
    `nas_overnight: ${d.strategies.nas_overnight.armed ? "armed" : "idle"}`,
    `Error: ${d.orb_error || "none"}`,
  ];
  document.getElementById("health-pills").innerHTML = pills.map(p => `<span class="pill">${p}</span>`).join("");

  document.getElementById("rej-body").innerHTML = d.rejections.slice(0, 5).map(r =>
    `<tr><td>${r.symbol}</td><td>${(r.reasons || []).join(", ")}</td></tr>`
  ).join("") || `<tr><td colspan="2">None</td></tr>`;

  document.getElementById("trades-body").innerHTML = d.recent_trades.map(t =>
    `<tr><td>${(t.exit_utc || "").slice(0, 16).replace("T", " ")}</td><td>${t.symbol}</td><td>${t.side}</td><td>${t.variant}</td><td>${t.lots}</td><td class="${t.usd >= 0 ? "pos" : "neg"}">${fmtUsd(t.usd)}</td><td>${t.R ?? "--"}</td><td>${t.reason}</td></tr>`
  ).join("") || `<tr><td colspan="8">No trades</td></tr>`;
}

async function load() {
  if (window.BG_DATA) { render(window.BG_DATA); return; }
  const res = await fetch("data/data.json?t=" + Date.now());
  render(await res.json());
}
document.getElementById("refresh-btn").addEventListener("click", () => location.reload());
load();
