#!/usr/bin/env python3
"""
Codifica en base64 totes les respostes correctes d'una fitxa d'activitats,
perquè no es puguin llegir obrint el codi font de la pàgina.

Converteix cada  data-correcta="X"  en  data-c="<base64 de X>"
i cada  data-sol-text  (vegeu més avall) en  data-sol="<base64>".

Ús:
    python3 eines/codifica-respostes.py s2-nom-de-la-sessio/index.html

Sobreescriu l'arxiu indicat. Fes-ne una còpia abans si vols conservar la
versió amb les respostes encara en clar.

Per als blocs de solució escrits (les explicacions llargues, com les de
"1.2 Resistència" a la S1), escriu'ls normalment dins d'un bloc:

    <div class="solucio" hidden data-sol-text>
      <h3>Solució</h3>
      <p>El text que vulguis...</p>
    </div>

L'script els buidarà i mourà el contingut a l'atribut data-sol codificat.
"""
import base64
import re
import sys


def encode_attr(match: re.Match) -> str:
    valor = match.group(1)
    b64 = base64.b64encode(valor.encode("utf-8")).decode("ascii")
    return f'data-c="{b64}"'


def encode_solucions(content: str) -> str:
    def reemplaça(m: re.Match) -> str:
        atributs_previs = m.group(1)
        contingut = m.group(2)
        b64 = base64.b64encode(contingut.strip().encode("utf-8")).decode("ascii")
        # treu el marcador data-sol-text dels atributs previs, si hi és
        atributs_nets = atributs_previs.replace("data-sol-text", "").strip()
        if atributs_nets:
            atributs_nets = " " + atributs_nets
        return f'<div class="solucio" hidden{atributs_nets} data-sol="{b64}"></div>'

    patró = re.compile(
        r'<div class="solucio" hidden([^>]*data-sol-text[^>]*)>(.*?)</div>',
        re.S,
    )
    return patró.sub(reemplaça, content)


def main():
    if len(sys.argv) != 2:
        print("Ús: python3 codifica-respostes.py <fitxer.html>")
        sys.exit(1)

    ruta = sys.argv[1]
    with open(ruta, encoding="utf-8") as f:
        content = f.read()

    content, n_respostes = re.subn(r'data-correcta="([^"]*)"', encode_attr, content)
    content = encode_solucions(content)

    with open(ruta, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Fet. {n_respostes} respostes codificades a {ruta}.")
    print("Revisa que el fitxer encara s'obre bé al navegador abans de publicar-lo.")


if __name__ == "__main__":
    main()
