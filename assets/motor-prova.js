/**
 * Motor de PROVES (exàmens) per a les fitxes del repositori.
 *
 * És un motor a part de motor-fitxa.js perquè una prova funciona diferent
 * d'una fitxa de pràctica:
 *
 *  - El contingut de la prova va XIFRAT a la pàgina (AES-GCM). Només es pot
 *    obrir amb el "codi de la prova" que el professor diu a l'aula el dia de
 *    l'examen. Així, encara que la pàgina sigui pública a GitHub Pages, ningú
 *    pot veure-la abans d'hora (ni obrint el codi font).
 *  - Cada alumne rep VARIANTS diferents de les preguntes. La variant depèn
 *    del nom i el grup que escriu: si recarrega la pàgina, li surt la mateixa
 *    prova (no pot "tornar a tirar els daus"), i dos companys de taula
 *    gairebé mai tenen les mateixes preguntes.
 *  - Ni colors verd/vermell, ni solucions, ni nota a la pantalla de l'alumne.
 *  - Una sola entrega. Les respostes es desen al navegador mentre es fa la
 *    prova (si es tanca la pestanya per error, en tornar-hi es recuperen).
 *  - Es compta quantes vegades l'alumne surt de la pàgina (canvia de pestanya
 *    o de finestra) i quants minuts hi ha estat. Surt al full de càlcul.
 *
 * Ús (a l'HTML de la prova):
 *
 *   ProvaEngine.init({
 *     scriptUrl: "https://script.google.com/macros/s/.../exec",
 *     xifrat: { salt: "...", iv: "...", dades: "..." },   // generat amb eines/xifra-prova.py
 *     clauLocal: "prova1-normal",                          // per desar el progrés al navegador
 *     pasAPas: false,          // true = una pregunta per pantalla (versió amb suport)
 *     escolta: false           // true = botó 🔊 Escolta a cada pregunta
 *   });
 *
 * El contingut (un cop desxifrat) és un JSON amb aquesta forma:
 *
 *   { "activitat": "Prova 1 Esforços i estructures",
 *     "activitatOberta": "Prova 1 — Respostes obertes",
 *     "blocs": [ { "id":"p1", "titol":"...", "consigna":"...", "punts":1.5,
 *                  "tipus":"tria" | "dosnivells" | "unica" | "oberta",
 *                  "opcions":[...],          // (tria) llista comuna del bloc
 *                  "figura":"<svg>…</svg>",  // opcional
 *                  "slots":[ [variant, variant, ...], ... ] } ] }
 *
 * De cada "slot" se n'escull UNA variant per alumne. Cada slot és una
 * pregunta (fila) del bloc i val punts/slots.length.
 *
 *  - tria:       variant = {t:"enunciat", c:"resposta", opcions?:[...]}
 *  - dosnivells: variant = {t:"afirmació", vf:"V"|"F", raons:["correcta","distractor",...]}
 *                (només puntua si encerta el V/F i també la raó)
 *  - unica:      variant = {t:"enunciat", figura?:"<svg>", opcions:["correcta","distractor",...]}
 *  - oberta:     variant = {t:"enunciat", ajuda?:"inici de frase"}  → no puntua sola,
 *                s'envia a una pestanya a part perquè la corregeixi el professor.
 *
 * Convenció: la PRIMERA opció de cada llista ("raons", "opcions" d'unica)
 * és sempre la correcta; el motor les barreja abans de mostrar-les.
 */
const ProvaEngine = (function () {
  "use strict";

  // ---------- utilitats ----------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function normalitza(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // hash de text → enter de 32 bits (cyrb53 simplificat)
  function hash(text) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    return h1 >>> 0;
  }

  // generador pseudoaleatori amb llavor (mulberry32): mateix nom → mateixa prova
  function generador(llavor) {
    let a = llavor;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function barreja(array, rnd) {
    const c = array.slice();
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  }

  function desa(clau, valor) {
    try { localStorage.setItem(clau, JSON.stringify(valor)); } catch (e) { /* sense emmagatzematge: no passa res */ }
  }
  function llegeix(clau) {
    try { const v = localStorage.getItem(clau); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }

  async function desxifra(xifrat, codi) {
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey("raw", enc.encode(codi), "PBKDF2", false, ["deriveKey"]);
    const clau = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64ToBytes(xifrat.salt), iterations: 150000, hash: "SHA-256" },
      material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
    const pla = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(xifrat.iv) }, clau, b64ToBytes(xifrat.dades)
    );
    return JSON.parse(new TextDecoder().decode(pla));
  }

  function escolta(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ca-ES";
    const veus = speechSynthesis.getVoices();
    const ca = veus.find(v => v.lang && v.lang.toLowerCase().startsWith("ca"));
    if (ca) u.voice = ca;
    u.rate = 0.92;
    speechSynthesis.speak(u);
  }

  // ---------- motor ----------
  function init(config) {
    const { scriptUrl, xifrat, clauLocal = "prova", pasAPas = false, escolta: ambEscolta = false } = config;

    const elNom = $("#camp-nom"), elGrup = $("#camp-grup"), elCodi = $("#camp-codi");
    const btnInici = $("#btn-inici"), estatInici = $("#estat-inici");
    const zona = $("#zona-prova"), entrega = $("#entrega");
    const btnEntrega = $("#btn-entrega"), estatEntrega = $("#estat-entrega");

    let prova = null;       // contingut desxifrat
    let model = [];         // preguntes concretes d'aquest alumne
    let respostes = {};     // {clauPregunta: valor}
    let clauAlumne = "";
    let inici = 0, sortides = 0;
    let pagina = 0;

    // comptador de sortides de la pàgina (només un cop començada la prova)
    document.addEventListener("visibilitychange", () => {
      if (prova && document.hidden && !entregada()) {
        sortides++;
        desaProgres();
      }
    });

    function entregada() {
      const d = llegeix(clauAlumne);
      return !!(d && d.entregada);
    }

    function desaProgres(extra = {}) {
      if (!clauAlumne) return;
      const prev = llegeix(clauAlumne) || {};
      desa(clauAlumne, Object.assign(prev, { respostes, sortides, inici }, extra));
    }

    btnInici.addEventListener("click", async () => {
      const nom = elNom.value.trim(), grup = elGrup.value, codi = elCodi.value.trim().toUpperCase();
      if (!nom || nom.split(/\s+/).length < 2 || !grup) {
        estatInici.textContent = "Escriu el teu nom i cognom i tria el grup.";
        estatInici.className = "estat-entrega error";
        return;
      }
      if (!codi) {
        estatInici.textContent = "Escriu el codi que et dirà el professor.";
        estatInici.className = "estat-entrega error";
        return;
      }
      if (!window.crypto || !crypto.subtle) {
        estatInici.textContent = "Aquest navegador no pot obrir la prova. Avisa el professor.";
        estatInici.className = "estat-entrega error";
        return;
      }
      btnInici.disabled = true;
      estatInici.textContent = "Obrint la prova…";
      estatInici.className = "estat-entrega enviant";
      try {
        prova = await desxifra(xifrat, codi);
      } catch (e) {
        btnInici.disabled = false;
        estatInici.textContent = "El codi no és correcte. Torna-ho a provar.";
        estatInici.className = "estat-entrega error";
        return;
      }

      clauAlumne = `${clauLocal}:${normalitza(grup)}:${normalitza(nom)}`;
      const guardat = llegeix(clauAlumne);
      if (guardat && guardat.entregada) {
        estatInici.textContent = "Aquesta prova ja està entregada amb aquest nom. Si és un error, avisa el professor.";
        estatInici.className = "estat-entrega error";
        return;
      }
      if (guardat) {
        respostes = guardat.respostes || {};
        sortides = guardat.sortides || 0;
        inici = guardat.inici || Date.now();
      } else {
        inici = Date.now();
      }

      elNom.readOnly = true; elGrup.disabled = true; elCodi.readOnly = true;
      $("#bloc-inici").hidden = true;
      $("#resum-alumne").textContent = `${nom} · ${grup}`;
      $("#resum-alumne").hidden = false;

      construeixModel(nom, grup);
      pinta();
      entrega.hidden = false;
      desaProgres();
    });

    function construeixModel(nom, grup) {
      const rnd = generador(hash(normalitza(nom) + "|" + normalitza(grup) + "|" + (prova.activitat || "")));
      model = prova.blocs.map(bloc => {
        const files = bloc.slots.map((slot, i) => {
          const idx = Math.floor(rnd() * slot.length);
          const v = slot[idx];
          const fila = { clau: `${bloc.id}.${i}`, variant: idx, dada: v };
          if (bloc.tipus === "tria") fila.opcions = barreja(v.opcions || bloc.opcions, rnd);
          if (bloc.tipus === "dosnivells") fila.raons = barreja(v.raons.map((r, k) => ({ r, k })), rnd);
          if (bloc.tipus === "unica") fila.opcions = barreja(v.opcions.map((r, k) => ({ r, k })), rnd);
          return fila;
        });
        return { bloc, files: bloc.barrejaFiles === false ? files : barreja(files, rnd) };
      });
    }

    function textEscolta(m) {
      const parts = [m.bloc.titol, m.bloc.consigna || ""];
      m.files.forEach((f, i) => {
        parts.push(`${String.fromCharCode(97 + i)}. ${f.dada.t}`);
        if (f.opcions && m.bloc.tipus === "unica") f.opcions.forEach(o => parts.push(o.r));
        if (f.opcions && m.bloc.tipus === "tria") parts.push("Opcions: " + f.opcions.join(", "));
        if (f.raons) parts.push("Per què? " + f.raons.map(o => o.r).join(". "));
      });
      return parts.join(". ");
    }

    function pinta() {
      zona.innerHTML = "";
      model.forEach((m, bi) => {
        const sec = document.createElement("section");
        sec.className = "activitat pregunta-prova";
        sec.dataset.bloc = bi;
        const punts = m.bloc.punts ? `<span class="punts">${String(m.bloc.punts).replace(".", ",")} p</span>` : "";
        sec.innerHTML =
          `<h2><em>${bi + 1}</em> ${m.bloc.titol}${punts}</h2>` +
          (m.bloc.consigna ? `<p class="consigna">${m.bloc.consigna}</p>` : "") +
          (ambEscolta ? `<p><button type="button" class="secundari btn-escolta">🔊 Escolta</button></p>` : "") +
          (m.bloc.figura ? `<figure class="figura figura-svg">${m.bloc.figura}</figure>` : "");

        const llista = document.createElement("ol");
        llista.className = "files-prova";
        m.files.forEach((f, i) => llista.appendChild(pintaFila(m.bloc, f, i)));
        sec.appendChild(llista);
        zona.appendChild(sec);

        const be = sec.querySelector(".btn-escolta");
        if (be) be.addEventListener("click", () => escolta(textEscolta(m)));
      });

      if (pasAPas) {
        const nav = document.createElement("nav");
        nav.className = "nav-pas";
        nav.innerHTML =
          `<button type="button" class="secundari" id="btn-ant">← Anterior</button>` +
          `<span id="pas-actual"></span>` +
          `<button type="button" id="btn-seg">Següent →</button>`;
        zona.appendChild(nav);
        $("#btn-ant").addEventListener("click", () => mostraPagina(pagina - 1));
        $("#btn-seg").addEventListener("click", () => mostraPagina(pagina + 1));
        mostraPagina(0);
      }
    }

    function mostraPagina(n) {
      pagina = Math.max(0, Math.min(model.length - 1, n));
      zona.querySelectorAll(".pregunta-prova").forEach((s, i) => { s.hidden = i !== pagina; });
      $("#pas-actual").textContent = `Pregunta ${pagina + 1} de ${model.length}`;
      $("#btn-ant").disabled = pagina === 0;
      $("#btn-seg").hidden = pagina === model.length - 1;
      entrega.hidden = pagina !== model.length - 1;
      window.scrollTo({ top: zona.offsetTop - 70, behavior: "smooth" });
    }

    function radios(nom, opcions, valorDesat, onChange) {
      const ul = document.createElement("ul");
      ul.className = "opcions-radio";
      opcions.forEach(o => {
        const li = document.createElement("li");
        const id = `${nom}-${o.k}`;
        li.innerHTML = `<label for="${id}"><input type="radio" name="${nom}" id="${id}" value="${o.k}"> <span>${o.r}</span></label>`;
        const inp = li.querySelector("input");
        if (String(valorDesat) === String(o.k)) inp.checked = true;
        inp.addEventListener("change", () => onChange(o.k));
        ul.appendChild(li);
      });
      return ul;
    }

    // esquema opcional d'una pregunta (SVG dins del contingut xifrat); "petita" = esquema de situació, més xicotet
    function figura(f) {
      return f.dada.figura
        ? `<figure class="figura figura-svg${f.dada.petita ? " petita" : ""}">${f.dada.figura}</figure>`
        : "";
    }

    function pintaFila(bloc, f, i) {
      const li = document.createElement("li");
      li.className = `fila-prova tipus-${bloc.tipus}`;
      const lletra = String.fromCharCode(97 + i);
      const nomCamp = f.clau.replace(".", "_");

      if (bloc.tipus === "tria") {
        li.innerHTML = `<span class="lletra">${lletra}</span><span class="enunciat">${f.dada.t}</span>`;
        const sel = document.createElement("select");
        sel.setAttribute("aria-label", `Pregunta ${lletra}`);
        sel.innerHTML = `<option value="">Tria…</option>` + f.opcions.map(o => `<option value="${o}">${o}</option>`).join("");
        if (respostes[f.clau]) sel.value = respostes[f.clau];
        sel.addEventListener("change", () => { respostes[f.clau] = sel.value; desaProgres(); });
        li.appendChild(sel);
      }

      if (bloc.tipus === "dosnivells") {
        li.innerHTML =
          `<div class="dn-cap"><span class="lletra">${lletra}</span><span class="enunciat">${f.dada.t}</span></div>` + figura(f);
        const r = respostes[f.clau] || {};
        const vf = radios(`${nomCamp}_vf`, [{ r: "Veritat", k: "V" }, { r: "Fals", k: "F" }], r.vf, k => {
          respostes[f.clau] = Object.assign(respostes[f.clau] || {}, { vf: k }); desaProgres();
        });
        vf.classList.add("vf");
        const per = document.createElement("p");
        per.className = "dn-per";
        per.textContent = "Per què?";
        const raons = radios(`${nomCamp}_r`, f.raons, r.raon, k => {
          respostes[f.clau] = Object.assign(respostes[f.clau] || {}, { raon: k }); desaProgres();
        });
        li.append(vf, per, raons);
      }

      if (bloc.tipus === "unica") {
        li.innerHTML =
          `<div class="dn-cap"><span class="lletra">${lletra}</span><span class="enunciat">${f.dada.t}</span></div>` + figura(f);
        li.appendChild(radios(nomCamp, f.opcions, respostes[f.clau], k => { respostes[f.clau] = k; desaProgres(); }));
      }

      if (bloc.tipus === "oberta") {
        li.innerHTML =
          `<div class="dn-cap"><span class="lletra">${lletra}</span><span class="enunciat">${f.dada.t}</span></div>`;
        const ta = document.createElement("textarea");
        ta.rows = 4; ta.maxLength = 400;
        ta.setAttribute("aria-label", "Resposta");
        ta.placeholder = f.dada.ajuda || "Escriu aquí la teva resposta";
        ta.value = respostes[f.clau] || (f.dada.ajuda ? "" : "");
        ta.addEventListener("input", () => { respostes[f.clau] = ta.value; desaProgres(); });
        li.appendChild(ta);
        if (f.dada.ajuda) {
          const aj = document.createElement("p");
          aj.className = "ajuda-frase";
          aj.innerHTML = `Pots començar així: <i>${f.dada.ajuda}</i>`;
          li.appendChild(aj);
        }
      }
      return li;
    }

    // ---------- correcció ----------
    function corregeix() {
      let punts = 0, max = 0;
      const detall = [], oberta = {}, variants = [];
      model.forEach((m, bi) => {
        const b = m.bloc;
        if (b.tipus === "oberta") {
          m.files.forEach((f, i) => { oberta[`resposta_${bi + 1}${String.fromCharCode(97 + i)}`] = (respostes[f.clau] || "").trim(); });
          detall.push(`${bi + 1} ${b.titol}: pendent (${b.punts} p, la corregeix el professor)`);
          return;
        }
        const valor = b.punts / m.files.length;
        let encerts = 0;
        m.files.forEach(f => {
          const r = respostes[f.clau];
          let be = false;
          if (b.tipus === "tria") be = r === f.dada.c;
          if (b.tipus === "dosnivells") be = !!r && r.vf === f.dada.vf && String(r.raon) === "0";
          if (b.tipus === "unica") be = String(r) === "0";
          if (be) encerts++;
          variants.push(`${f.clau}v${f.variant}${be ? "✓" : "✗"}`);
        });
        const p = Math.round(encerts * valor * 100) / 100;
        punts += p; max += b.punts;
        detall.push(`${bi + 1} ${b.titol}: ${encerts}/${m.files.length} → ${String(p).replace(".", ",")} p`);
      });
      return { punts: Math.round(punts * 100) / 100, max, detall, oberta, variants };
    }

    function sensResposta() {
      const buides = [];
      model.forEach((m, bi) => m.files.forEach(f => {
        const r = respostes[f.clau];
        let falta = false;
        if (m.bloc.tipus === "tria") falta = !r;
        if (m.bloc.tipus === "dosnivells") falta = !r || !r.vf || r.raon === undefined;
        if (m.bloc.tipus === "unica") falta = r === undefined;
        if (falta) buides.push(bi);
      }));
      return buides;
    }

    let confirmant = false;
    btnEntrega.addEventListener("click", () => {
      if (!prova || entregada()) return;
      const buides = sensResposta();
      if (buides.length && !confirmant) {
        const preguntes = [...new Set(buides)].map(n => n + 1).join(", ");
        estatEntrega.textContent = `Et falta respondre alguna cosa de la pregunta ${preguntes}. Si vols entregar igualment, torna a prémer el botó.`;
        estatEntrega.className = "estat-entrega error";
        confirmant = true;
        if (pasAPas) mostraPagina(buides[0]);
        return;
      }
      if (!confirmant) {
        estatEntrega.textContent = "Segur? Un cop entregada no la podràs canviar. Prem el botó una altra vegada per entregar.";
        estatEntrega.className = "estat-entrega enviant";
        confirmant = true;
        return;
      }
      envia();
    });

    function envia() {
      if (!scriptUrl || scriptUrl.includes("ENGANXA_AQUI")) {
        estatEntrega.textContent = "La prova no està connectada al full de càlcul. Avisa el professor.";
        estatEntrega.className = "estat-entrega error";
        return;
      }
      const nom = elNom.value.trim(), grup = elGrup.value;
      const c = corregeix();
      const minuts = Math.round((Date.now() - inici) / 60000);
      const percentatge = c.max ? Math.round((c.punts / c.max) * 100) : 0;

      btnEntrega.disabled = true;
      estatEntrega.textContent = "Enviant…";
      estatEntrega.className = "estat-entrega enviant";

      const principal = new URLSearchParams({
        sessio: prova.activitat,
        nom, grup,
        encerts: String(c.punts).replace(".", ","),
        total: c.max,
        percentatge,
        activitats: `${pasAPas ? "versió amb suport" : "versió ordinària"} · ${minuts} min`,
        solucions: sortides, // aquí: nombre de vegades que ha sortit de la pàgina
        detall: c.detall.join(" · ") + " || model: " + c.variants.join(" ")
      });
      const obertes = new URLSearchParams(Object.assign({
        sessio: prova.activitatOberta || (prova.activitat + " — Respostes obertes"),
        nom, grup
      }, c.oberta));

      Promise.all([
        fetch(scriptUrl, { method: "POST", mode: "no-cors", body: principal }),
        fetch(scriptUrl, { method: "POST", mode: "no-cors", body: obertes })
      ]).then(() => {
        desaProgres({ entregada: true, quan: new Date().toISOString() });
        zona.querySelectorAll("input, select, textarea, button").forEach(el => { el.disabled = true; });
        zona.hidden = true;
        $(".entrega-caixa h2").textContent = "Prova entregada";
        $(".entrega-caixa p").textContent = "Ja està. El professor rebrà les teves respostes. Pots tancar la pàgina.";
        btnEntrega.hidden = true;
        estatEntrega.textContent = `Entregada, ${nom}.`;
        estatEntrega.className = "estat-entrega ok";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }).catch(() => {
        btnEntrega.disabled = false;
        confirmant = true;
        estatEntrega.textContent = "No s'ha pogut enviar. Comprova la connexió i torna a prémer el botó (les respostes no es perden).";
        estatEntrega.className = "estat-entrega error";
      });
    }
  }

  return { init };
})();
