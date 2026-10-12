#!/usr/bin/env python3
"""
Genera la còpia per al professorat (solucions.html) d'una fitxa, a partir
del seu index.html. Així no cal mantenir dues pàgines a mà: quan canvies la
fitxa de l'alumnat, tornes a executar l'script i la de solucions queda al dia.

Ús:
    python3 eines/genera-solucions.py s2-estructures

Què fa amb una còpia d'index.html:
  - afegeix <meta name="robots" content="noindex, nofollow"> i "Solucions
    (professorat)" al <title>
  - posa la franja vermella d'avís a dalt de tot
  - treu les seccions .identificacio i .entrega (no s'hi entrega res)
  - a FitxaEngine.init(): ambSolucions: true, i treu scriptUrl i
    comprovaDespresEntrega (els botons Comprova i Mostra la solució hi són sempre)
  - canvia el peu per «Còpia amb solucions, ús intern del professorat»
  - si a la carpeta hi ha solucions-obertes.json, afegeix una resposta model
    sota cada pregunta de text lliure (textarea). Format:

        {
          "pont-a": {
            "model": "Sí, perquè està formada per triangles…",
            "accepta": "També «la forma la fa resistent» (OK+)."
          },
          "raon-2": "També es pot posar només el text de la resposta model."
        }

    Les claus són l'id de cada <textarea>. "accepta" és opcional.

El resultat es desa a <carpeta>/solucions.html (se sobreescriu). A GitHub
Pages s'obre amb .../<carpeta>/solucions (sense .html també funciona).
"""
import html
import json
import re
import sys
from pathlib import Path

FRANJA = (
    '    <div\n'
    '      style="background:var(--ko);color:#fff;text-align:center;padding:.6rem 1rem;'
    'font-family:var(--display);font-weight:500;font-size:.85rem;"\n'
    '    >\n'
    '      ⚠️ Versió amb solucions, només per al professorat — no la comparteixis\n'
    '      amb l\'alumnat. No està enllaçada des de la web pública.\n'
    '    </div>\n'
)

ESTIL_MODEL = """    <style>
      /* només a solucions.html: respostes model de les preguntes obertes */
      .model-resposta {
        border-left: 4px solid var(--ok);
        background: #eef6f1;
        padding: 0.55rem 0.8rem;
        margin-top: 0.5rem;
        font-size: 0.92rem;
      }
      .model-resposta b { font-family: var(--display); font-weight: 500; }
      .model-resposta .accepta { margin: 0.3rem 0 0; color: var(--ink-soft); }
    </style>
"""


def treu_seccio(text: str, classe: str) -> str:
    """Elimina <section class="classe">…</section> (sense seccions niuades)."""
    patro = re.compile(
        r'\n?[ \t]*<section class="' + re.escape(classe) + r'"[^>]*>.*?</section>[ \t]*\n?',
        re.S,
    )
    text, n = patro.subn("\n", text)
    if n == 0:
        print(f"  (no hi havia cap secció .{classe})")
    return text


def bloc_model(valor) -> str:
    if isinstance(valor, str):
        valor = {"model": valor}
    model = valor.get("model", "")
    accepta = valor.get("accepta")
    trossos = [
        '<div class="model-resposta">',
        f"<b>Resposta model:</b> {model}",
    ]
    if accepta:
        trossos.append(f'<p class="accepta">Accepta també: {accepta}</p>')
    trossos.append("</div>")
    return "".join(trossos)


def afegeix_models(text: str, models: dict) -> str:
    usats = set()
    for id_, valor in models.items():
        # posa el bloc just després del comptador de caràcters, o del textarea
        patro_compt = re.compile(
            r'(<span class="compt" data-per="' + re.escape(id_) + r'">.*?</span>)', re.S
        )
        patro_ta = re.compile(
            r'(<textarea[^>]*\bid="' + re.escape(id_) + r'"[^>]*>.*?</textarea>)', re.S
        )
        for patro in (patro_compt, patro_ta):
            text, n = patro.subn(lambda m: m.group(1) + "\n          " + bloc_model(valor), text, count=1)
            if n:
                usats.add(id_)
                break
    falten = set(models) - usats
    if falten:
        print("  ⚠️ No s'ha trobat cap textarea amb aquests id:", ", ".join(sorted(falten)))
    return text


def main():
    if len(sys.argv) != 2:
        print("Ús: python3 eines/genera-solucions.py <carpeta-de-la-sessio>")
        sys.exit(1)

    carpeta = Path(sys.argv[1])
    origen = carpeta / "index.html"
    if not origen.exists():
        print(f"No trobo {origen}")
        sys.exit(1)

    text = origen.read_text(encoding="utf-8")

    if "FitxaEngine.init" not in text:
        print("Aquesta pàgina no fa servir FitxaEngine (és una prova?). No hi faig res.")
        sys.exit(1)

    # capçalera
    text = re.sub(
        r"(<title>)(.*?)( — Activitats)?(</title>)",
        lambda m: f"{m.group(1)}{m.group(2)} — Solucions (professorat){m.group(4)}",
        text,
        count=1,
    )
    if 'name="robots"' not in text:
        text = text.replace(
            '<meta name="viewport"',
            '<meta name="robots" content="noindex, nofollow" />\n    <meta name="viewport"',
            1,
        )

    # respostes model de les preguntes obertes (opcional)
    fitxer_models = carpeta / "solucions-obertes.json"
    if fitxer_models.exists():
        models = json.loads(fitxer_models.read_text(encoding="utf-8"))
        text = text.replace("</head>", ESTIL_MODEL + "  </head>", 1)
        text = afegeix_models(text, models)

    # franja d'avís
    text = re.sub(r"(<body[^>]*>\n)", lambda m: m.group(1) + FRANJA + "\n", text, count=1)

    # fora identificació i entrega
    text = treu_seccio(text, "identificacio")
    text = treu_seccio(text, "entrega")

    # configuració del motor
    text = re.sub(r"[ \t]*scriptUrl:[^\n]*\n", "", text)
    text = re.sub(r"[ \t]*comprovaDespresEntrega:[^\n]*\n", "", text)
    text = re.sub(r"ambSolucions:\s*false", "ambSolucions: true", text)
    if "ambSolucions: true" not in text:
        text = text.replace("FitxaEngine.init({", "FitxaEngine.init({\n        ambSolucions: true,", 1)
    # treu els comentaris ⚙️/⚠️ pensats per a la versió de l'alumnat i hi posa una nota pròpia
    text = re.sub(r"[ \t]*// [⚙⚠]️[^\n]*\n([ \t]*// [^\n]*\n)*", "", text)
    text = text.replace(
        "FitxaEngine.init({",
        "FitxaEngine.init({\n"
        "        // ⚙️ Còpia només per al professorat, generada amb eines/genera-solucions.py:\n"
        "        // mostra les solucions i no envia res al full de càlcul.",
        1,
    )
    text = re.sub(r"\n{3,}", "\n\n", text)

    # peu
    text = re.sub(
        r"(<footer>.*?)(\s*</p>\s*</footer>)",
        lambda m: m.group(1).rstrip() + " · Còpia amb solucions, ús intern del professorat" + m.group(2),
        text,
        count=1,
        flags=re.S,
    )

    desti = carpeta / "solucions.html"
    desti.write_text(text, encoding="utf-8")
    print(f"✔ {desti} generat")


if __name__ == "__main__":
    main()
