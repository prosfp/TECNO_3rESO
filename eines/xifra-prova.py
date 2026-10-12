"""
Xifra el contingut d'una prova perquè només es pugui obrir amb un codi.

Ús:
    python eines/xifra-prova.py contingut.json CODI sortida.js NOM_VARIABLE

Exemple:
    python eines/xifra-prova.py prova1-normal.json TRIANGLE prova-1/contingut.js PROVA_XIFRADA

Genera un fitxer .js amb una constant (p. ex. PROVA_XIFRADA) que la pàgina de
la prova passa a ProvaEngine.init({ xifrat: PROVA_XIFRADA, ... }).

IMPORTANT: el fitxer contingut.json (amb les preguntes i les respostes en clar)
NO s'ha de pujar mai al repositori, perquè GitHub Pages el publicaria.

Requereix: pip install cryptography
El codi es passa a majúscules (l'alumnat el pot escriure com vulgui).
"""
import base64
import json
import os
import sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ITERACIONS = 150_000  # ha de coincidir amb motor-prova.js


def xifra(text: str, codi: str) -> dict:
    salt = os.urandom(16)
    iv = os.urandom(12)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERACIONS)
    clau = kdf.derive(codi.strip().upper().encode("utf-8"))
    dades = AESGCM(clau).encrypt(iv, text.encode("utf-8"), None)
    b64 = lambda b: base64.b64encode(b).decode("ascii")
    return {"salt": b64(salt), "iv": b64(iv), "dades": b64(dades)}


def main():
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    entrada, codi, sortida, variable = sys.argv[1:]
    with open(entrada, encoding="utf-8") as f:
        contingut = json.load(f)
    blob = xifra(json.dumps(contingut, ensure_ascii=False), codi)
    with open(sortida, "w", encoding="utf-8") as f:
        f.write("// Contingut xifrat de la prova. Generat amb eines/xifra-prova.py — no editar a mà.\n")
        f.write(f"const {variable} = {json.dumps(blob)};\n")
    print(f"Fet: {sortida} ({variable}), codi «{codi.strip().upper()}»")


if __name__ == "__main__":
    main()
