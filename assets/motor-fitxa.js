/**
 * Motor compartit per a les fitxes interactives d'activitats.
 *
 * Cada pàgina de sessió (per exemple s1-forces-esforcos/index.html) inclou
 * aquest fitxer i després el crida així:
 *
 *   FitxaEngine.init({
 *     scriptUrl: "https://script.google.com/macros/s/.../exec",
 *     ambSolucions: false,
 *     opcions: ["Tracció","Compressió","Flexió","Torsió","Cisallament"],
 *     titols: {a11:"1.1 ...", a12:"1.2 ...", ...}
 *   });
 *
 * Requereix, a l'HTML de cada activitat, la mateixa estructura que ja fem
 * servir: .activitat[data-activitat], select[data-c] / input[data-c] amb la
 * resposta correcta codificada en base64, botons [data-accio="comprova|solucio|neteja"],
 * un .veredicte, i opcionalment un .solucio[data-sol] i #marcador / #btn-entrega
 * / #camp-nom / #camp-grup / #estat-entrega per a la identificació i l'entrega.
 *
 * Qualsevol widget propi d'una activitat concreta (com el gronxador de la S1)
 * es queda com a codi a part, a la mateixa pàgina, fora d'aquest motor.
 */
const FitxaEngine = (function () {

  function decodeBase64Utf8(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  function init(config) {
    const {
      scriptUrl,
      ambSolucions = false,
      opcions = [],
      titols = {}
    } = config;

    const resoltes = new Set();
    const estat = {}; // {id:{encerts,total,solucio}}
    const totalActivitats = document.querySelectorAll(".activitat").length;

    // 1) descodifica totes les respostes correctes (venen amagades en base64
    //    perquè no es llegeixin obrint el codi font de la pàgina)
    document.querySelectorAll("[data-c]").forEach(el => {
      el.dataset.correcta = decodeBase64Utf8(el.dataset.c);
    });

    // 2) si aquesta edició és "sense solucions", no en deixa ni rastre al DOM
    if (!ambSolucions) {
      document.querySelectorAll('button[data-accio="solucio"]').forEach(b => b.remove());
      document.querySelectorAll(".solucio").forEach(s => { s.removeAttribute("data-sol"); s.remove(); });
    }

    // 3) omple tots els desplegables amb les opcions d'aquesta fitxa
    document.querySelectorAll("select[data-c]").forEach(sel => {
      sel.insertAdjacentHTML("beforeend", '<option value="">Tria…</option>');
      opcions.forEach(o => sel.insertAdjacentHTML("beforeend", `<option value="${o}">${o}</option>`));
      sel.addEventListener("change", () => sel.classList.remove("ok", "ko"));
    });

    function actualitzaMarcador() {
      const m = document.getElementById("marcador");
      if (!m || !totalActivitats) return;
      const n = resoltes.size;
      m.textContent = n === totalActivitats
        ? `Totes ${totalActivitats} activitats resoltes`
        : `${n} de ${totalActivitats} activitats resoltes`;
    }

    function comprova(bloc) {
      let encerts = 0, total = 0;

      bloc.querySelectorAll("select[data-c]").forEach(sel => {
        total++;
        const be = sel.value === sel.dataset.correcta;
        sel.classList.toggle("ok", be);
        sel.classList.toggle("ko", !be);
        if (be) encerts++;
      });

      bloc.querySelectorAll(".caselles input").forEach(inp => {
        total++;
        const be = inp.checked === (inp.dataset.correcta === "true");
        inp.closest("label").classList.toggle("ok", be);
        inp.closest("label").classList.toggle("ko", !be);
        if (be) encerts++;
      });

      const id = bloc.dataset.activitat;
      estat[id] = estat[id] || { solucio: false };
      estat[id].encerts = encerts;
      estat[id].total = total;

      const v = bloc.querySelector(".veredicte");
      if (encerts === total) {
        v.textContent = "Tot correcte.";
        v.className = "veredicte tot";
        resoltes.add(id);
      } else {
        v.textContent = `${encerts} de ${total}. Revisa les marcades en vermell.`;
        v.className = "veredicte parcial";
        resoltes.delete(id);
      }
      actualitzaMarcador();
    }

    function solucio(bloc) {
      if (!ambSolucions) return; // aquesta edició no en mostra

      bloc.querySelectorAll("select[data-c]").forEach(sel => {
        sel.value = sel.dataset.correcta;
        sel.classList.remove("ko");
        sel.classList.add("ok");
      });
      bloc.querySelectorAll(".caselles input").forEach(inp => {
        inp.checked = inp.dataset.correcta === "true";
        inp.closest("label").classList.remove("ko");
        inp.closest("label").classList.add("ok");
      });
      const s = bloc.querySelector(".solucio");
      if (s) {
        if (s.dataset.sol) s.innerHTML = decodeBase64Utf8(s.dataset.sol);
        s.hidden = false;
      }
      const v = bloc.querySelector(".veredicte");
      v.textContent = "Solució a la vista.";
      v.className = "veredicte";

      const id = bloc.dataset.activitat;
      estat[id] = estat[id] || {};
      estat[id].solucio = true;
      resoltes.delete(id); // consultar la solució no compta com a resolt pel propi mèrit
      actualitzaMarcador();
    }

    function neteja(bloc) {
      bloc.querySelectorAll("select[data-c]").forEach(sel => { sel.value = ""; sel.classList.remove("ok", "ko"); });
      bloc.querySelectorAll(".caselles input").forEach(inp => { inp.checked = false; inp.closest("label").classList.remove("ok", "ko"); });
      const s = bloc.querySelector(".solucio");
      if (s) s.hidden = true;
      const v = bloc.querySelector(".veredicte");
      v.textContent = ""; v.className = "veredicte";
      resoltes.delete(bloc.dataset.activitat);
      actualitzaMarcador();
    }

    document.querySelectorAll(".activitat").forEach(bloc => {
      bloc.addEventListener("click", ev => {
        const b = ev.target.closest("button[data-accio]");
        if (!b) return;
        if (b.dataset.accio === "comprova") comprova(bloc);
        if (b.dataset.accio === "solucio") solucio(bloc);
        if (b.dataset.accio === "neteja") neteja(bloc);
      });
    });

    // 4) entrega de la fitxa (si la pàgina té els elements necessaris)
    const btnEntrega = document.getElementById("btn-entrega");
    const estatEntrega = document.getElementById("estat-entrega");

    if (btnEntrega && estatEntrega) {
      btnEntrega.addEventListener("click", () => {
        const nomEl = document.getElementById("camp-nom");
        const grupEl = document.getElementById("camp-grup");
        const nom = nomEl ? nomEl.value.trim() : "";
        const grup = grupEl ? grupEl.value : "";

        if (!nom || !grup) {
          estatEntrega.textContent = "Escriu el nom i tria el grup abans d'entregar.";
          estatEntrega.className = "estat-entrega error";
          return;
        }
        if (!scriptUrl || scriptUrl.includes("ENGANXA_AQUI")) {
          estatEntrega.textContent = "La fitxa encara no està connectada al full de càlcul (falta l'URL de l'Apps Script).";
          estatEntrega.className = "estat-entrega error";
          return;
        }

        let totalEncerts = 0, totalPreguntes = 0, solucionsConsultades = 0;
        const detall = Object.keys(titols).map(id => {
          const e = estat[id] || {};
          if (e.solucio) solucionsConsultades++;
          if (typeof e.encerts === "number") {
            totalEncerts += e.encerts;
            totalPreguntes += e.total;
          }
          const marca = e.solucio ? " (solució vista)" : "";
          const resultat = typeof e.encerts === "number" ? `${e.encerts}/${e.total}` : "no comprovat";
          return `${titols[id]}: ${resultat}${marca}`;
        }).join(" · ");

        const percentatge = totalPreguntes ? Math.round((totalEncerts / totalPreguntes) * 100) : 0;

        btnEntrega.disabled = true;
        estatEntrega.textContent = "Enviant…";
        estatEntrega.className = "estat-entrega enviant";

        const dades = new URLSearchParams({
          nom, grup,
          encerts: totalEncerts,
          total: totalPreguntes,
          percentatge,
          activitats: `${resoltes.size}/${totalActivitats}`,
          solucions: solucionsConsultades,
          detall
        });

        fetch(scriptUrl, { method: "POST", mode: "no-cors", body: dades })
          .then(() => {
            estatEntrega.textContent = `Fitxa entregada, ${nom}. Encerts: ${totalEncerts}/${totalPreguntes}.`;
            estatEntrega.className = "estat-entrega ok";
          })
          .catch(() => {
            estatEntrega.textContent = "No s'ha pogut enviar. Comprova la connexió i torna-ho a provar.";
            estatEntrega.className = "estat-entrega error";
            btnEntrega.disabled = false;
          });
      });
    }

    actualitzaMarcador();
  }

  return { init };
})();
