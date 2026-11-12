/**
 * Laboratoris 3D de la S3 (màquines simples). Codi propi d'aquesta sessió,
 * fora del motor de correcció. Necessita ../assets/three.min.js (Three.js r128).
 *
 * Cada laboratori té dues parts independents:
 *  - la LECTURA (càlculs amb els números dels controls): funciona sempre;
 *  - l'ESCENA 3D: només si el navegador pot fer WebGL. Si no, surt un avís
 *    i la lectura continua funcionant igual.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const num = (x, d = 2) => Number(x.toFixed(d)).toLocaleString("ca-ES");
  const C = { f: 0xb8352a, r: 0x1d6fb8, fusta: 0xc9a06b, metall: 0xb7c0c8, fosc: 0x2b3a42, pedra: 0x9aa3ad, terra: 0xdfe5e8, rosca: 0xd9822b, corda: 0x8a6d3b };

  function potWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
  const TE3D = typeof THREE !== "undefined" && potWebGL();

  // ---------- eines comunes ----------
  function escena(id, opc) {
    const cont = $(id);
    if (!TE3D) {
      cont.innerHTML = '<p class="no3d">Aquest ordinador no pot mostrar el model 3D. Fes servir els controls i la lectura de sota: funcionen igual.</p>';
      return null;
    }
    const o = Object.assign({ dist: 10, th: 0.6, ph: 1.15, look: [0, 1, 0] }, opc);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    cont.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.85); d1.position.set(5, 9, 7); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(-6, 3, -5); scene.add(d2);
    let th = o.th, ph = o.ph, dist = o.dist, arr = null;
    const posa = () => {
      camera.position.set(o.look[0] + dist * Math.sin(ph) * Math.cos(th), o.look[1] + dist * Math.cos(ph), o.look[2] + dist * Math.sin(ph) * Math.sin(th));
      camera.lookAt(o.look[0], o.look[1], o.look[2]);
    };
    const cv = renderer.domElement;
    cv.addEventListener("pointerdown", (e) => { arr = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
    cv.addEventListener("pointermove", (e) => {
      if (!arr) return;
      th += (e.clientX - arr[0]) * 0.01;
      ph = Math.max(0.3, Math.min(1.55, ph - (e.clientY - arr[1]) * 0.008));
      arr = [e.clientX, e.clientY]; posa();
    });
    cv.addEventListener("pointerup", () => { arr = null; cv.style.cursor = "grab"; });
    cv.addEventListener("wheel", (e) => { e.preventDefault(); dist = Math.max(o.dist * 0.5, Math.min(o.dist * 1.6, dist + e.deltaY * 0.01)); posa(); }, { passive: false });
    const mida = () => { const w = cont.clientWidth, h = cont.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    new ResizeObserver(mida).observe(cont);
    posa(); mida();
    const ticks = [];
    let visible = true;
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; }).observe(cont);
    (function bucle(t) {
      if (visible) { ticks.forEach((f) => f(t)); renderer.render(scene, camera); }
      requestAnimationFrame(bucle);
    })(0);
    return { scene, ticks };
  }
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o));
  function etiqueta(text, color = "#15242b", mida = 0.5) {
    const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    ctx.font = "bold 64px IBM Plex Sans, Segoe UI, sans-serif";
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    cv.width = w; cv.height = 84;
    ctx.font = "bold 64px IBM Plex Sans, Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(0, 0, w, 84);
    ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.fillText(text, 12, 44);
    const tex = new THREE.CanvasTexture(cv);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    s.scale.set((mida * w) / 84, mida, 1);
    s.renderOrder = 10;
    return s;
  }
  function corda(a, b, color = C.corda, r = 0.035) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const L = A.distanceTo(B);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.max(L, 0.001), 8), mat(color));
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  }
  function fletxa(dir, origen, L, color) {
    const head = Math.min(0.45, L * 0.4);
    const a = new THREE.ArrowHelper(new THREE.Vector3(...dir).normalize(), new THREE.Vector3(...origen), L, color, head, head * 0.6);
    a.line.material.linewidth = 3;
    // fem la tija gruixuda (les línies de WebGL sempre fan 1 px)
    const tija = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L - head, 10), mat(color));
    tija.position.y = (L - head) / 2;
    a.add(tija);
    return a;
  }
  function cercleDiscontinu(radi, color, y = 0, eix = "y") {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(eix === "y" ? new THREE.Vector3(Math.cos(a) * radi, y, Math.sin(a) * radi) : new THREE.Vector3(Math.cos(a) * radi, Math.sin(a) * radi, y));
    }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color, dashSize: 0.18, gapSize: 0.12 }));
    l.computeLineDistances();
    return l;
  }
  function buida(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
  }
  const terra = (sc, y = 0, mida = 14) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(mida, 0.1, mida * 0.6), mat(C.terra));
    t.position.y = y - 0.05; sc.add(t);
  };
  function anima(dur, pas, fi) {
    const t0 = performance.now();
    requestAnimationFrame(function f(t) {
      const k = Math.min((t - t0) / dur, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      pas(e);
      if (k < 1) requestAnimationFrame(f); else if (fi) fi();
    });
  }
  function lliga(ids, fn) { ids.forEach((id) => { $(id).addEventListener("input", fn); $(id).addEventListener("change", fn); }); fn(); }

  // ============ 1 · PALANCA ============
  (function () {
    const E = escena("e3-palanca", { dist: 11, th: 1.25, ph: 1.2, look: [0.6, 1.0, 0] });
    const S = 1.3, Y = 1.1;
    let barra, mobil, cotes, angle = 0, objectiu = 0;
    if (E) {
      terra(E.scene);
      const tri = new THREE.Shape(); tri.moveTo(-0.55, 0); tri.lineTo(0.55, 0); tri.lineTo(0, Y - 0.08); tri.lineTo(-0.55, 0);
      const fulcre = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.0, bevelEnabled: false }), mat(C.pedra));
      fulcre.position.z = -0.5; E.scene.add(fulcre);
      const ef = etiqueta("fulcre", "#15242b", 0.38); ef.position.set(0, 0.35, 0.9); E.scene.add(ef);
      barra = new THREE.Group(); barra.position.y = Y; E.scene.add(barra);
      const tauló = new THREE.Mesh(new THREE.BoxGeometry(2.7 * S + 3.2 * S, 0.16, 0.9), mat(C.fusta, { roughness: 0.8 }));
      tauló.position.x = (3.2 * S - 2.7 * S) / 2; barra.add(tauló);
      mobil = new THREE.Group(); barra.add(mobil);
      cotes = new THREE.Group(); E.scene.add(cotes);
      E.ticks.push(() => { angle += (objectiu - angle) * 0.08; barra.rotation.z = angle; });
    }
    function actualitza() {
      const R = +$("pR").value, d2 = +$("pd2").value, d1 = +$("pd1").value, F = +$("pF").value;
      $("o-pR").textContent = R + " N"; $("o-pd2").textContent = num(d2) + " m";
      $("o-pd1").textContent = num(d1) + " m"; $("o-pF").textContent = F + " N";
      const Mr = R * d2, Mf = F * d1, eq = Math.abs(Mf - Mr) <= Mr * 0.02;
      if (E) {
        objectiu = eq ? 0 : Math.max(-0.22, Math.min(0.22, ((Mr - Mf) / Math.max(Mr, Mf)) * 0.22));
        buida(mobil); buida(cotes);
        const m = 0.35 + R / 1400;
        const caixa = new THREE.Mesh(new THREE.BoxGeometry(m, m, m), mat(C.pedra));
        caixa.position.set(-d2 * S, 0.08 + m / 2, 0); mobil.add(caixa);
        const eR = etiqueta("R = " + R + " N", "#1d6fb8", 0.4); eR.position.set(-d2 * S, m + 0.5, 0); mobil.add(eR);
        if (F > 0) {
          const L = 0.6 + F / 450;
          mobil.add(fletxa([0, -1, 0], [d1 * S, 0.1 + L, 0], L, C.f));
          const eF = etiqueta("F = " + F + " N", "#b8352a", 0.4); eF.position.set(d1 * S, L + 0.45, 0); mobil.add(eF);
        }
        [[-d2 * S, C.r, "d₂ = " + num(d2) + " m", "#1d6fb8"], [d1 * S, C.f, "d₁ = " + num(d1) + " m", "#b8352a"]].forEach(([x, c, t, h]) => {
          const g = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x), 0.04, 0.04), mat(c));
          g.position.set(x / 2, 0.06, 0.95); cotes.add(g);
          const e = etiqueta(t, h, 0.34); e.position.set(x + Math.sign(x) * 0.9, 0.3, 1.0); cotes.add(e);
        });
      }
      const estat = eq ? '<span class="estat ok">Equilibri!</span>' : Mf < Mr ? '<span class="estat ko">Guanya la resistència: fes més força o allarga el braç.</span>' : '<span class="estat ko">Fas massa força: la barra puja de cop.</span>';
      $("l-palanca").innerHTML = `${estat}<br>Gira cap a la força: <b>F · d₁ = ${F} · ${num(d1)} = ${num(Mf, 1)}</b> · Gira cap a la resistència: <b>R · d₂ = ${R} · ${num(d2)} = ${num(Mr, 1)}</b><br>Per estar en equilibri cal <b>F = ${num(Mr / d1, 1)} N</b> · Avantatge mecànic <b>i = ${num(d1 / d2)}</b>`;
    }
    lliga(["pR", "pd2", "pd1", "pF"], actualitza);
  })();

  // ============ 2 · POLITJA ============
  (function () {
    const E = escena("e3-politja", { dist: 11, th: 1.3, ph: 1.25, look: [0.3, 2.6, 0] });
    const SOSTRE = 5.2, S = 0.55;
    let g;
    if (E) {
      terra(E.scene);
      const biga = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.3, 1.2), mat(C.fusta, { roughness: 0.8 }));
      biga.position.y = SOSTRE + 0.15; E.scene.add(biga);
      g = new THREE.Group(); E.scene.add(g);
    }
    const politja = (x, y, r = 0.38) => {
      const p = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.18, 32), mat(C.metall, { metalness: 0.5, roughness: 0.35 }));
      disc.rotation.x = Math.PI / 2; p.add(disc);
      const eix = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 12), mat(C.fosc)); eix.rotation.x = Math.PI / 2; p.add(eix);
      p.position.set(x, y, 0); return p;
    };
    function actualitza() {
      const n = +$("tN").value, R = +$("tR").value, c = +$("tC").value;
      const cordes = n === 0 ? 1 : 2 * n, F = R / cordes, puja = c / cordes;
      $("o-tR").textContent = R + " N"; $("o-tC").textContent = num(c) + " m";
      if (E) {
        buida(g);
        const mida = 0.5 + R / 2400;
        if (n === 0) {
          const y = SOSTRE - 0.7, r = 0.42;
          g.add(corda([0, SOSTRE, 0], [0, y, 0], C.fosc, 0.04)); g.add(politja(0, y, r));
          const top = 0.3 + mida + puja * S * 1.2;
          g.add(corda([-r, y, 0], [-r, top, 0], C.r, 0.04));
          const caixa = new THREE.Mesh(new THREE.BoxGeometry(mida, mida, mida), mat(C.pedra));
          caixa.position.set(-r, top - mida / 2, 0); g.add(caixa);
          const lliure = Math.max(0.6, 2.6 - c * S * 1.2);
          g.add(corda([r, y, 0], [r, lliure, 0], C.corda, 0.04));
          g.add(fletxa([0, -1, 0], [r, lliure, 0], 0.9, C.f));
          const eR = etiqueta("R = " + R + " N", "#1d6fb8", 0.38); eR.position.set(-r - 1.1, top - mida / 2, 0); g.add(eR);
          const eF = etiqueta("F = " + num(F, 0) + " N", "#b8352a", 0.38); eF.position.set(r + 1.1, lliure - 0.3, 0); g.add(eF);
        } else {
          const amp = 3.2, xs = [];
          for (let i = 0; i < cordes; i++) xs.push(-amp / 2 + (i * amp) / (cordes - 1));
          const yb = 1.9 + puja * S * 1.4;
          // politges fixes a dalt i mòbils a baix (una per cada parella de cordes)
          for (let i = 0; i < n; i++) {
            const xm = (xs[2 * i] + xs[2 * i + 1]) / 2, rm = (xs[2 * i + 1] - xs[2 * i]) / 2;
            g.add(politja(xm, yb, rm));
            if (i < n - 1 || true) {
              const xf = i < n - 1 ? (xs[2 * i + 1] + xs[2 * i + 2]) / 2 : xs[cordes - 1] + 0.45;
              const rf = i < n - 1 ? (xs[2 * i + 2] - xs[2 * i + 1]) / 2 : 0.45;
              g.add(politja(xf, SOSTRE - 0.6, rf));
              g.add(corda([xf, SOSTRE, 0], [xf, SOSTRE - 0.6, 0], C.fosc, 0.04));
            }
          }
          xs.forEach((x) => g.add(corda([x, x === xs[0] ? SOSTRE : SOSTRE - 0.6, 0], [x, yb, 0], C.r, 0.045)));
          const barra = new THREE.Mesh(new THREE.BoxGeometry(amp + 0.4, 0.12, 0.25), mat(C.fosc));
          barra.position.set(0, yb - 0.45, 0); g.add(barra);
          xs.forEach((x, i) => { if (i % 2 === 0) g.add(corda([(x + xs[i + 1]) / 2, yb, 0], [(x + xs[i + 1]) / 2, yb - 0.45, 0], C.fosc, 0.04)); });
          g.add(corda([0, yb - 0.45, 0], [0, yb - 0.75, 0], C.fosc, 0.04));
          const caixa = new THREE.Mesh(new THREE.BoxGeometry(mida * 1.3, mida, mida), mat(C.pedra));
          caixa.position.set(0, yb - 0.75 - mida / 2, 0); g.add(caixa);
          const xl = xs[cordes - 1] + 0.9;
          const lliure = Math.max(0.5, 2.8 - c * S * 0.6);
          g.add(corda([xl, SOSTRE - 0.6, 0], [xl, lliure, 0], C.corda, 0.04));
          g.add(fletxa([0, -1, 0], [xl, lliure, 0], 0.9, C.f));
          const eR = etiqueta("R = " + R + " N", "#1d6fb8", 0.38); eR.position.set(-amp / 2 - 1.2, yb - 0.9, 0); g.add(eR);
          const eF = etiqueta("F = " + num(F, 0) + " N", "#b8352a", 0.38); eF.position.set(xl + 1.1, lliure - 0.2, 0); g.add(eF);
          const eC = etiqueta(cordes + " cordes aguanten", "#1d6fb8", 0.34); eC.position.set(0, SOSTRE - 1.3, 0.6); g.add(eC);
        }
      }
      const fmla = n === 0 ? `F = R = ${R} N` : `F = R ÷ (2 · ${n}) = ${R} ÷ ${cordes} = ${num(F, 1)} N`;
      $("l-politja").innerHTML = `Cordes que aguanten la càrrega: <b>${cordes}</b> · <b>${fmla}</b> · i = <b>${cordes}</b><br>Has estirat <b>${num(c)} m</b> de corda i la càrrega ha pujat <b>${num(puja)} m</b>. ${n === 0 ? "Amb la corriola no estalvies força: només estires cap avall, que és més còmode." : "Menys força, però més corda: és la regla d'or."}`;
    }
    lliga(["tN", "tR", "tC"], actualitza);
  })();

  // ============ 3 · PLA INCLINAT ============
  (function () {
    const E = escena("e3-pla", { dist: 11.5, th: 1.2, ph: 1.2, look: [0.5, 1.2, 0] });
    let g, t = 0.12, enMarxa = false;
    if (E) { terra(E.scene); g = new THREE.Group(); E.scene.add(g); }
    function actualitza() {
      const P = +$("lP").value, h = +$("lh").value;
      if (+$("ll").value < h) $("ll").value = h;
      const l = +$("ll").value, F = (P * h) / l, base = Math.sqrt(Math.max(l * l - h * h, 0));
      $("o-lP").textContent = P + " N"; $("o-lh").textContent = num(h) + " m"; $("o-ll").textContent = num(l) + " m";
      if (E) {
        buida(g);
        const s = Math.min(7.5 / Math.max(base, 0.01), 3.4 / h, 1.4), B = base * s, H = h * s, x0 = -B / 2 - 0.6;
        const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(B, 0); tri.lineTo(B, H); tri.lineTo(0, 0);
        const rampa = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.8, bevelEnabled: false }), mat(0xe8dcc8, { roughness: 0.9 }));
        rampa.position.set(x0, 0, -0.9); g.add(rampa);
        const moll = new THREE.Mesh(new THREE.BoxGeometry(1.4, Math.max(H, 0.01), 1.8), mat(0xd5d9de));
        moll.position.set(x0 + B + 0.7, H / 2, 0); g.add(moll);
        const ang = Math.atan2(H, B), Ls = Math.sqrt(B * B + H * H);
        const caixa = new THREE.Group();
        const cb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat(C.fusta));
        cb.position.y = 0.3; caixa.add(cb);
        caixa.add(fletxa([1, 0, 0], [0.35, 0.3, 0], 0.5 + Math.min(F / 500, 1.6), C.f));
        caixa.rotation.z = ang;
        caixa.userData = { x0, ang, Ls };
        g.add(caixa);
        const posa = () => caixa.position.set(x0 + Math.cos(ang) * (0.35 + t * (Ls - 0.9)), Math.sin(ang) * (0.35 + t * (Ls - 0.9)), 0);
        posa(); g.userData.posa = posa;
        const eh = etiqueta("h = " + num(h) + " m", "#15242b", 0.36); eh.position.set(x0 + B + 1.7, H / 2, 0.9); g.add(eh);
        const el = etiqueta("l = " + num(l) + " m", "#15242b", 0.36); el.position.set(x0 + B * 0.45, H * 0.45 + 0.9, 0.9); g.add(el);
        const eF = etiqueta("F = " + num(F, 0) + " N", "#b8352a", 0.38); eF.position.set(x0 + B * 0.2, H * 0.2 + 1.6, 0); g.add(eF);
      }
      $("l-pla").innerHTML = `<b>F = P · h ÷ l = ${P} · ${num(h)} ÷ ${num(l)} = ${num(F, 1)} N</b> · i = l ÷ h = <b>${num(l / h)}</b><br>Per pujar la caixa <b>${num(h)} m</b> camines <b>${num(l)} m</b> de rampa.${l === h ? " La rampa és vertical: és com aixecar-la de dret!" : ""}`;
    }
    lliga(["lP", "lh", "ll"], actualitza);
    $("b-pla").addEventListener("click", () => {
      if (!E || enMarxa) return;
      enMarxa = true; t = 0.0;
      anima(2600, (e) => { t = e; g.userData.posa(); }, () => { enMarxa = false; });
    });
  })();

  // ============ 4 · CARGOL ============
  (function () {
    const E = escena("e3-cargol", { dist: 10, th: 0.6, ph: 1.1, look: [0, -1.4, 0] });
    const RN = 0.45, L = 4.2, ESC_P = 0.22, ESC_R = 0.009;
    let cargol, cami, avanc, voltes = 0, enMarxa = false;
    if (E) {
      const bloc = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 3.2), mat(C.fusta, { roughness: 0.9, transparent: true, opacity: 0.35 }));
      bloc.position.y = -3.6; E.scene.add(bloc);
      terra(E.scene, -4.4, 10);
      cargol = new THREE.Group(); E.scene.add(cargol);
      avanc = new THREE.Group(); E.scene.add(avanc);
    }
    function construeix() {
      if (!E) return;
      const p = +$("cp").value, r = +$("cr").value;
      buida(cargol); if (cami) E.scene.remove(cami);
      const metall = mat(C.metall, { metalness: 0.55, roughness: 0.35 }), fosc = mat(C.fosc, { metalness: 0.4, roughness: 0.5 });
      const nucli = new THREE.Mesh(new THREE.CylinderGeometry(RN, RN, L, 32), metall); nucli.position.y = -L / 2; cargol.add(nucli);
      const punta = new THREE.Mesh(new THREE.ConeGeometry(RN, 0.6, 32), metall); punta.rotation.x = Math.PI; punta.position.y = -L - 0.3; cargol.add(punta);
      const pas = p * ESC_P, nv = (L - 0.3) / pas;
      class Hel extends THREE.Curve { getPoint(t) { const a = t * nv * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * (RN + 0.06), -L + 0.15 + t * nv * pas, -Math.sin(a) * (RN + 0.06)); } }
      cargol.add(new THREE.Mesh(new THREE.TubeGeometry(new Hel(), Math.ceil(nv * 60), 0.09, 10, false), mat(C.rosca, { metalness: 0.3, roughness: 0.45 })));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.45, 6), fosc); cap.position.y = 0.22; cargol.add(cap);
      const Lc = r * ESC_R + 0.9;
      const clau = new THREE.Mesh(new THREE.BoxGeometry(Lc, 0.16, 0.32), fosc); clau.position.set(Lc / 2, 0.55, 0); cargol.add(clau);
      const maneta = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 16), mat(0x444444)); maneta.position.set(Lc, 0.85, 0); cargol.add(maneta);
      cargol.add(fletxa([0, 0, 1], [Lc, 0.85, -0.2], 1.1, C.f));
      cami = cercleDiscontinu(Lc, C.f, 0.85); E.scene.add(cami);
      reinicia();
    }
    function reinicia() { if (!E) return; cargol.position.y = 0; cargol.rotation.y = 0; cami.position.y = 0; buida(avanc); voltes = 0; llegeix(); }
    function llegeix() {
      const F = +$("cF").value, r = +$("cr").value, p = +$("cp").value;
      $("o-cF").textContent = F + " N"; $("o-cr").textContent = r + " mm"; $("o-cp").textContent = num(p) + " mm";
      const cam = 2 * Math.PI * r, R = (F * cam) / p;
      $("l-cargol").innerHTML = `<b>R = F · 2 · π · r ÷ p = ${F} · 2 · 3,14 · ${r} ÷ ${num(p)} ≈ ${Math.round(R).toLocaleString("ca-ES")} N</b> · i ≈ <b>${Math.round(R / F).toLocaleString("ca-ES")}</b><br>En una volta la mà recorre <b>${num(cam, 0)} mm</b> i el cargol avança només <b>${num(p)} mm</b>: el camí de la mà és <b>${num(cam / p, 0)} vegades</b> més llarg.` + (E ? `<br>Voltes fetes: <b>${voltes}</b> · El cargol ha baixat <b>${num(voltes * p, 1)} mm</b>` : "");
    }
    $("cF").addEventListener("input", llegeix);
    ["cr", "cp"].forEach((id) => $(id).addEventListener("input", () => { construeix(); llegeix(); }));
    $("b-cargol").addEventListener("click", () => {
      if (!E || enMarxa) return;
      const p = +$("cp").value;
      if (cargol.position.y - p * ESC_P < -1.6) reinicia();
      enMarxa = true;
      const ys = cargol.position.y, rs = cargol.rotation.y;
      anima(2200, (e) => { cargol.rotation.y = rs - e * Math.PI * 2; cargol.position.y = ys - e * p * ESC_P; cami.position.y = cargol.position.y; }, () => {
        enMarxa = false; voltes++;
        avanc.add(fletxa([0, -1, 0], [-1.25, ys + 0.25, 0.9], Math.max(p * ESC_P, 0.25), C.r));
        llegeix();
      });
    });
    $("b-cargol-0").addEventListener("click", reinicia);
    construeix(); llegeix();
  })();

  // ============ 5 · TORN ============
  (function () {
    const E = escena("e3-torn", { dist: 11, th: 0.75, ph: 1.15, look: [0, 2.0, 0] });
    const S = 0.06, YE = 3.4;
    let fix, gir, mobil, cami, voltes = 0, pujat = 0, enMarxa = false;
    if (E) {
      terra(E.scene);
      const pou = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.5, 32, 1, true), mat(C.pedra, { side: THREE.DoubleSide }));
      pou.position.y = 0.25; E.scene.add(pou);
      [-1.1, 1.1].forEach((z) => { const pal = new THREE.Mesh(new THREE.BoxGeometry(0.22, YE + 0.3, 0.22), mat(C.fusta)); pal.position.set(0, (YE + 0.3) / 2, z); E.scene.add(pal); });
      const eix = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.0, 12), mat(C.fosc)); eix.rotation.x = Math.PI / 2; eix.position.y = YE; E.scene.add(eix);
      fix = new THREE.Group(); E.scene.add(fix);
      gir = new THREE.Group(); gir.position.y = YE; E.scene.add(gir);
      mobil = new THREE.Group(); E.scene.add(mobil);
    }
    function construeix() {
      if (!E) return;
      const R = +$("nR").value, re = +$("nre").value, Rm = +$("nRm").value;
      buida(gir); buida(fix);
      const rS = re * S + 0.1, mS = Rm * S + 0.2;
      const tambor = new THREE.Mesh(new THREE.CylinderGeometry(rS, rS, 1.8, 32), mat(C.fusta)); tambor.rotation.x = Math.PI / 2; gir.add(tambor);
      for (let i = 0; i < 6; i++) { const ll = new THREE.Mesh(new THREE.TorusGeometry(rS + 0.01, 0.025, 6, 32), mat(C.corda)); ll.position.z = -0.6 + i * 0.22; gir.add(ll); }
      const braç = new THREE.Mesh(new THREE.BoxGeometry(mS, 0.14, 0.14), mat(C.fosc)); braç.position.set(mS / 2, 0, 1.45); gir.add(braç);
      const mà = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12), mat(0x444444)); mà.rotation.x = Math.PI / 2; mà.position.set(mS, 0, 1.7); gir.add(mà);
      gir.add(fletxa([0, -1, 0], [mS, 0.05, 1.95], 0.9, C.f));
      cami = cercleDiscontinu(mS, C.f, 1.7, "z"); cami.position.y = YE; fix.add(cami);
      const eRm = etiqueta("Rₘ = " + Rm + " cm", "#b8352a", 0.36); eRm.position.set(mS + 0.4, YE - 0.9, 2.0); fix.add(eRm);
      const ere = etiqueta("rₑ = " + re + " cm", "#1d6fb8", 0.36); ere.position.set(-rS - 1.0, YE + 0.7, 0); fix.add(ere);
      const mida = 0.45 + R / 2500;
      mobil.userData = { rS, mida };
      reinicia();
    }
    function dibuixaGalleda() {
      if (!E) return;
      buida(mobil);
      const { rS, mida } = mobil.userData, R = +$("nR").value;
      const yG = 0.55 + pujat;
      mobil.add(corda([-rS, YE, 0], [-rS, yG + mida, 0], C.corda, 0.035));
      const gall = new THREE.Mesh(new THREE.CylinderGeometry(mida * 0.6, mida * 0.45, mida, 20), mat(C.pedra));
      gall.position.set(-rS, yG + mida / 2, 0); mobil.add(gall);
      const eR = etiqueta("R = " + R + " N", "#1d6fb8", 0.36); eR.position.set(-rS - 1.3, yG + mida / 2, 0); mobil.add(eR);
    }
    function reinicia() { if (!E) return; gir.rotation.z = 0; voltes = 0; pujat = 0; dibuixaGalleda(); llegeix(); }
    function llegeix() {
      const R = +$("nR").value, re = +$("nre").value, Rm = +$("nRm").value, F = (R * re) / Rm;
      $("o-nR").textContent = R + " N"; $("o-nre").textContent = re + " cm"; $("o-nRm").textContent = Rm + " cm";
      $("l-torn").innerHTML = `<b>F · ${Rm} = ${R} · ${re}</b> → <b>F = ${R * re} ÷ ${Rm} = ${num(F, 1)} N</b> · i = Rₘ ÷ rₑ = <b>${num(Rm / re)}</b><br>En una volta, la galleda puja <b>${num(2 * Math.PI * re, 1)} cm</b> i la mà recorre <b>${num(2 * Math.PI * Rm, 1)} cm</b>.` + (E ? ` Voltes fetes: <b>${voltes}</b>` : "");
    }
    ["nR", "nre", "nRm"].forEach((id) => $(id).addEventListener("input", () => { construeix(); llegeix(); }));
    $("b-torn").addEventListener("click", () => {
      if (!E || enMarxa) return;
      const re = +$("nre").value, puja = Math.PI * re * S; // la meitat del real, perquè hi càpiguen unes quantes voltes
      if (0.55 + pujat + puja + mobil.userData.mida > YE - 0.3) reinicia();
      enMarxa = true;
      const rs = gir.rotation.z, p0 = pujat;
      anima(2200, (e) => { gir.rotation.z = rs + e * Math.PI * 2; pujat = p0 + e * puja; dibuixaGalleda(); }, () => { enMarxa = false; voltes++; llegeix(); });
    });
    $("b-torn-0").addEventListener("click", reinicia);
    construeix(); llegeix();
  })();
})();
