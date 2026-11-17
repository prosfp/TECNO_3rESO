/**
 * Esquemes i simuladors de màquines simples per a les PROVES.
 *
 * El motor de proves (motor-prova.js) els fa servir de dues maneres:
 *  - esquema estàtic d'una pregunta:  {esquema: {maq:"palanca", R:600, d2:0.5, d1:1.5, F:"?"}}
 *  - simulador (tipus de bloc "simulador"): l'alumne mou un control i el dibuix
 *    canvia (el braç s'allarga, la rampa creix, hi ha més politges...). El dibuix
 *    NO diu si està bé: només mostra el valor triat. La resposta és el valor.
 *
 * Tot és SVG (sense WebGL) perquè funcioni a qualsevol ordinador de l'aula.
 */
const SimProva = (function () {
  "use strict";
  const C = { fusta: "#c8a06a", fustaV: "#8a6a3c", terra: "#7d6a55", pedra: "#9aa5ad", tinta: "#15242b",
    F: "#c0392b", R: "#1d6fb8", cota: "#5b6b73", corda: "#2b4b5a", rampa: "#e6d9c4", caixa: "#c8a06a" };
  const num = (v) => {
    if (typeof v !== "number") return v;
    const [e, d] = String(Math.round(v * 100) / 100).split(".");
    return e.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? "," + d : "");
  };
  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="IBM Plex Sans,Arial,sans-serif" font-size="${o.mida || 15}" ` +
    `fill="${o.color || C.tinta}" text-anchor="${o.ancla || "middle"}" font-weight="${o.pes || 600}" ` +
    `paint-order="stroke" stroke="#f4f7f8" stroke-width="${o.halo ?? 4}" stroke-linejoin="round">${s}</text>`;
  const fletxa = (x1, y1, x2, y2, color) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 11;
    const p1 = [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)];
    const p2 = [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>` +
      `<polygon points="${x2},${y2} ${p1} ${p2}" fill="${color}"/>`;
  };
  // línia de cota horitzontal amb el text a sota
  const cota = (x1, x2, y, s, color = C.cota) =>
    `<g stroke="${color}" stroke-width="1.5"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>` +
    `<line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}"/></g>` +
    txt((x1 + x2) / 2, y + 20, s, { color, mida: 14 });
  const terra = (x1, x2, y) =>
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C.terra}" stroke-width="3"/>` +
    Array.from({ length: Math.floor((x2 - x1) / 14) }, (_, i) =>
      `<line x1="${x1 + 8 + i * 14}" y1="${y + 1}" x2="${x1 + i * 14}" y2="${y + 9}" stroke="${C.terra}" stroke-width="1.2"/>`).join("");
  const svg = (w, h, cos, etiqueta) =>
    `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${etiqueta}">${cos}</svg>`;

  // ---------------- PALANCA ----------------
  // R i d2 a l'esquerra del fulcre, F i d1 a la dreta. Qualsevol valor pot ser "?".
  function palanca(p) {
    const S = 95, fx = 140, by = 120, d2 = p.d2v ?? p.d2, d1 = p.d1v ?? p.d1;
    const xr = fx - d2 * S, xf = fx + d1 * S, xFi = Math.max(xf + 18, fx + (p.maxd1 || 3) * S + 18);
    let s = terra(10, 500, 165);
    s += `<polygon points="${fx},${by + 6} ${fx - 20},165 ${fx + 20},165" fill="#8f9ba3" stroke="${C.tinta}" stroke-width="2"/>`;
    s += `<rect x="${Math.min(xr, 30) - 14}" y="${by - 4}" width="${xFi - Math.min(xr, 30) + 14}" height="10" rx="4" fill="${C.fusta}" stroke="${C.fustaV}"/>`;
    if (p.regle) for (let m = 0.5; m <= (p.maxd1 || 3) + 0.001; m += 0.5)
      s += `<line x1="${fx + m * S}" y1="${by - 4}" x2="${fx + m * S}" y2="${by + 6}" stroke="${C.fustaV}" stroke-width="${Number.isInteger(m) ? 2 : 1}"/>` +
        (Number.isInteger(m) ? txt(fx + m * S, by + 24, m + " m", { mida: 11, color: C.fustaV, pes: 400 }) : "");
    s += `<polygon points="${xr - 30},${by - 4} ${xr - 24},${by - 44} ${xr},${by - 56} ${xr + 24},${by - 44} ${xr + 28},${by - 4}" fill="${C.pedra}" stroke="${C.tinta}" stroke-width="2"/>`;
    s += txt(xr, by - 70, "R = " + num(p.R) + (p.R === "?" ? "" : " N"), { color: C.R });
    s += fletxa(xf, by - 62, xf, by - 8, C.F);
    s += txt(xf, by - 70, "F = " + num(p.F) + (p.F === "?" ? "" : " N"), { color: C.F });
    s += txt(fx, 182, "fulcre", { mida: 12, pes: 400 });
    s += cota(xr, fx, 200, "d₂ = " + num(d2) + (p.d2 === "?" ? "" : " m"));
    s += cota(fx, xf, 200, "d₁ = " + (p.d1 === "?" && p.d1v == null ? "?" : num(d1) + " m"));
    return svg(520, 230, s, "Palanca amb la resistència, el fulcre i la força");
  }

  // ---------------- POLITGES ----------------
  // n = 0 corriola (politja fixa); n >= 1 polispast amb n politges mòbils
  function politja(p) {
    const n = p.nv ?? p.n, r = 17, y0 = 40, ym = 165;
    let s = `<rect x="30" y="8" width="300" height="14" fill="${C.fustaV}"/>`;
    if (!n) {
      const cx = 160;
      s += `<line x1="${cx}" y1="22" x2="${cx}" y2="${y0}" stroke="${C.tinta}" stroke-width="3"/>`;
      s += `<circle cx="${cx}" cy="${y0 + r}" r="${r}" fill="#fff" stroke="${C.tinta}" stroke-width="3"/>`;
      s += `<line x1="${cx - r}" y1="${y0 + r}" x2="${cx - r}" y2="${ym + 10}" stroke="${C.corda}" stroke-width="3"/>`;
      s += `<line x1="${cx + r}" y1="${y0 + r}" x2="${cx + r}" y2="${ym + 20}" stroke="${C.corda}" stroke-width="3"/>`;
      s += `<rect x="${cx - r - 26}" y="${ym + 10}" width="50" height="44" fill="${C.pedra}" stroke="${C.tinta}" stroke-width="2"/>`;
      s += txt(cx - r, ym + 38, "R", { color: "#fff", halo: 0 });
      s += fletxa(cx + r, ym + 20, cx + r, ym + 62, C.F);
      s += txt(cx + r + 40, ym + 50, "F", { color: C.F });
      s += txt(14, 292, "corriola (politja fixa): només canvia la direcció", { mida: 13, pes: 400, ancla: "start" });
    } else {
      const dx = 2 * r + 14, x0 = 180 - (n * dx) / 2;
      const mob = [], fix = [];
      for (let i = 0; i < n; i++) { fix.push(x0 + i * dx + r); mob.push(x0 + i * dx + r); }
      s += `<line x1="${fix[0] - r - 6}" y1="${y0 - 4}" x2="${fix[n - 1] + r + 6}" y2="${y0 - 4}" stroke="${C.tinta}" stroke-width="3"/>`;
      s += `<line x1="180" y1="22" x2="180" y2="${y0 - 4}" stroke="${C.tinta}" stroke-width="3"/>`;
      // cordes: cada politja mòbil aporta 2 trossos
      let cordes = "";
      const xa = fix[0] - r; // extrem lligat al sostre
      cordes += `<line x1="${xa}" y1="${y0 - 4}" x2="${xa}" y2="${ym + r}" stroke="${C.corda}" stroke-width="2.6"/>`;
      for (let i = 0; i < n; i++) {
        cordes += `<line x1="${mob[i] + r}" y1="${ym + r}" x2="${fix[i] + r}" y2="${y0 + r}" stroke="${C.corda}" stroke-width="2.6"/>`;
        if (i + 1 < n) cordes += `<line x1="${fix[i] - r + dx}" y1="${y0 + r}" x2="${mob[i + 1] - r}" y2="${ym + r}" stroke="${C.corda}" stroke-width="2.6"/>`;
      }
      s += cordes;
      fix.forEach((x) => { s += `<circle cx="${x}" cy="${y0 + r}" r="${r}" fill="#fff" stroke="${C.tinta}" stroke-width="3"/>`; });
      mob.forEach((x) => { s += `<circle cx="${x}" cy="${ym + r}" r="${r}" fill="#fff" stroke="${C.tinta}" stroke-width="3"/>`; });
      const xs = fix[n - 1] + r;
      s += `<line x1="${xs}" y1="${y0 + r}" x2="${xs + 40}" y2="${ym + 40}" stroke="${C.corda}" stroke-width="2.6"/>`;
      s += fletxa(xs + 40, ym + 40, xs + 52, ym + 70, C.F) + txt(xs + 66, ym + 66, "F", { color: C.F });
      s += `<line x1="${mob[0] - r - 4}" y1="${ym + 2 * r + 4}" x2="${mob[n - 1] + r + 4}" y2="${ym + 2 * r + 4}" stroke="${C.tinta}" stroke-width="3"/>`;
      s += `<line x1="180" y1="${ym + 2 * r + 4}" x2="180" y2="${ym + 2 * r + 16}" stroke="${C.tinta}" stroke-width="3"/>`;
      s += `<rect x="148" y="${ym + 2 * r + 16}" width="64" height="40" fill="${C.pedra}" stroke="${C.tinta}" stroke-width="2"/>`;
      s += txt(180, ym + 2 * r + 42, "R", { color: "#fff", halo: 0 });
      s += txt(14, 292, n + (n === 1 ? " politja mòbil · " : " politges mòbils · ") + 2 * n + " cordes aguanten R", { mida: 13, pes: 400, ancla: "start" });
    }
    s += txt(14, 316, "R = " + num(p.R) + (p.R === "?" || p.R === "R" ? "" : " N"), { color: C.R, ancla: "start" });
    s += txt(160, 316, "F = " + num(p.F) + (p.F === "?" || p.F === "F" ? "" : " N"), { color: C.F, ancla: "start" });
    return svg(360, 326, s, "Muntatge de politges amb la càrrega i la força");
  }

  // ---------------- PLA INCLINAT ----------------
  function pla(p) {
    const S = 70, l = p.lv ?? p.l, h = p.h, base = 210, x0 = 40;
    const lp = (l === "?" ? 3 : l) * S, hp = h * S, run = Math.sqrt(Math.max(lp * lp - hp * hp, 1));
    const xt = x0 + run, yt = base - hp, a = Math.atan2(hp, run);
    let s = terra(10, 520, base);
    s += `<polygon points="${x0},${base} ${xt},${yt} ${xt},${base}" fill="${C.rampa}" stroke="${C.tinta}" stroke-width="2"/>`;
    s += `<rect x="${xt}" y="${yt}" width="${Math.max(500 - xt, 40)}" height="${hp}" fill="#d5dade" stroke="${C.tinta}" stroke-width="2"/>`;
    // caixa a mitja rampa
    const cx = x0 + run * 0.45, cy = base - hp * 0.45, ang = (-a * 180) / Math.PI;
    s += `<g transform="translate(${cx},${cy}) rotate(${ang})"><rect x="-18" y="-36" width="36" height="36" fill="${C.caixa}" stroke="${C.tinta}" stroke-width="2"/>` +
      `<text x="0" y="-12" font-size="13" text-anchor="middle" font-family="Arial" font-weight="700">P</text></g>`;
    const ux = Math.cos(a), uy = -Math.sin(a);
    s += fletxa(cx + 24 * ux - 22 * Math.sin(a) * 0, cy + 24 * uy - 30, cx + 70 * ux, cy + 70 * uy - 30, C.F);
    s += txt(cx + 80 * ux + 8, cy + 70 * uy - 40, "F", { color: C.F });
    // cotes
    s += `<g stroke="${C.cota}" stroke-width="1.5"><line x1="${xt + 14}" y1="${yt}" x2="${xt + 14}" y2="${base}"/></g>`;
    s += txt(xt + 20, (yt + base) / 2 + 5, "h = " + num(h) + " m", { ancla: "start", mida: 14, color: C.cota });
    const mx = x0 + run * 0.72 + 30 * Math.sin(a), my = base - hp * 0.72 + 30 * Math.cos(a);
    s += txt(mx, my, "l = " + (l === "?" ? "?" : num(l) + " m"), { mida: 14, color: C.cota });
    s += txt(500, 28, "P = " + num(p.P) + " N", { ancla: "end", color: C.R });
    s += txt(500, 50, "F = " + num(p.F) + (p.F === "?" ? "" : " N"), { ancla: "end", color: C.F });
    return svg(520, 230, s, "Rampa amb una caixa, l'alçada i la llargada");
  }

  // ---------------- TORN ----------------
  function torn(p) {
    const S = 4.2, re = p.re, Rm = p.Rmv ?? p.Rm, cx = 130, cy = 80;
    const rp = re * S + 6, Rp = (Rm === "?" ? 30 : Rm) * S;
    let s = `<rect x="${cx - 6}" y="${cy}" width="12" height="154" fill="${C.fustaV}"/>` + terra(20, 470, cy + 154);
    s += `<circle cx="${cx}" cy="${cy}" r="${rp}" fill="${C.fusta}" stroke="${C.tinta}" stroke-width="3"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="3" fill="${C.tinta}"/>`;
    // manovella cap a la dreta
    s += `<line x1="${cx}" y1="${cy}" x2="${cx + Rp}" y2="${cy}" stroke="${C.tinta}" stroke-width="7" stroke-linecap="round"/>`;
    s += `<rect x="${cx + Rp - 5}" y="${cy - 26}" width="10" height="26" rx="4" fill="${C.tinta}"/>`;
    s += fletxa(cx + Rp, cy - 30, cx + Rp, cy + 34, C.F) + txt(cx + Rp + 16, cy + 30, "F", { color: C.F });
    // corda i galleda a l'esquerra del cilindre
    s += `<line x1="${cx - rp}" y1="${cy}" x2="${cx - rp}" y2="${cy + 95}" stroke="${C.corda}" stroke-width="2.6"/>`;
    s += `<polygon points="${cx - rp - 22},${cy + 95} ${cx - rp + 22},${cy + 95} ${cx - rp + 16},${cy + 135} ${cx - rp - 16},${cy + 135}" fill="${C.pedra}" stroke="${C.tinta}" stroke-width="2"/>`;
    s += txt(cx - rp, cy + 121, "R", { color: "#fff", halo: 0 });
    s += cota(cx, cx + Rp, cy + 62, "Rm = " + (Rm === "?" ? "?" : num(Rm) + " cm"));
    s += txt(cx - rp - 6, cy - rp - 10, "re = " + num(re) + " cm", { mida: 14, color: C.cota, ancla: "end" });
    s += txt(460, 28, "R = " + num(p.R) + (p.R === "R" ? "" : " N"), { ancla: "end", color: C.R });
    s += txt(460, 50, "F = " + num(p.F) + (p.F === "?" ? "" : " N"), { ancla: "end", color: C.F });
    return svg(470, 245, s, "Torn amb el cilindre, la manovella i la galleda");
  }

  const MAQ = { palanca, politja, pla, torn };

  function dibuixa(e) { return MAQ[e.maq] ? MAQ[e.maq](e) : ""; }

  /**
   * Simulador: munta el dibuix + un control lliscant dins de `cont`.
   * v = {maq, par:{...}, control:{clau:"d1v", etiqueta:"d₁", min, max, pas, unitat}}
   * valor = resposta desada (o undefined). onChange(valor) quan l'alumne mou el control.
   */
  function simulador(cont, v, valor, onChange) {
    const c = v.control;
    const fig = document.createElement("figure");
    fig.className = "figura figura-svg simulador";
    const pinta = (x) => {
      const par = Object.assign({}, v.par, { regle: v.maq === "palanca" });
      if (x !== undefined) par[c.clau] = x;
      fig.innerHTML = dibuixa(Object.assign({ maq: v.maq }, par));
    };
    const caixa = document.createElement("div");
    caixa.className = "sim-control";
    const id = "sim-" + Math.random().toString(36).slice(2, 8);
    caixa.innerHTML =
      `<label for="${id}">${c.etiqueta}</label>` +
      `<input type="range" id="${id}" min="${c.min}" max="${c.max}" step="${c.pas}">` +
      `<output for="${id}"></output>`;
    const inp = caixa.querySelector("input"), out = caixa.querySelector("output");
    const mostra = (x) => { out.textContent = x === undefined ? "mou el control" : `${num(x)} ${c.unitat}`; };
    inp.value = valor !== undefined ? valor : c.inici ?? c.min;
    pinta(valor !== undefined ? valor : (c.inici ?? c.min));
    mostra(valor);
    inp.addEventListener("input", () => {
      const x = Number(inp.value);
      pinta(x); mostra(x); onChange(x);
    });
    cont.append(fig, caixa);
  }

  return { dibuixa, simulador, num };
})();
