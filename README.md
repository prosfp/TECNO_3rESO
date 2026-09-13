# Tecnologia i Digitalització 3r ESO — Activitats

Fitxes interactives d'activitats, publicades amb GitHub Pages.

## Estructura

```
assets/
  estil.css        ← estils compartits per totes les fitxes (no tocar per sessió)
  motor-fitxa.js    ← lògica de correcció i entrega, compartida
s1-forces-esforcos/
  index.html        ← contingut concret d'aquesta sessió
index.html          ← pàgina d'entrada amb la llista de sessions
eines/
  codifica-respostes.py  ← ajuda a preparar una nova fitxa (veure més avall)
```

## Com afegir una sessió nova (per exemple S2)

1. Duplica la carpeta `s1-forces-esforcos/` i posa-li el nom de la nova sessió
   (per exemple `s2-nom-de-la-sessio/`).
2. Dins, edita `index.html`: canvia el `<title>`, la capçalera (`<h1>`, `<p class="sessio">`,
   etc.) i substitueix les activitats pel contingut nou. L'estructura de cada
   activitat (`<section class="activitat" data-activitat="...">`, `select[data-c]`,
   `.caselles`, botons `data-accio="comprova|solucio|neteja"`) s'ha de mantenir
   igual perquè el motor compartit la reconegui.
3. Escriu les respostes correctes en clar primer (`data-correcta="Flexió"`, etc.)
   i, quan la fitxa estigui acabada, fes servir `eines/codifica-respostes.py`
   per convertir-les automàticament a `data-c` en base64.
4. Al final de la pàgina, actualitza la crida a `FitxaEngine.init({...})`:
   - `scriptUrl`: la URL del teu Apps Script. **És la mateixa per a totes les
     sessions** — no cal crear un full de càlcul nou cada vegada.
   - `activitat`: un nom curt i únic per aquesta sessió (per exemple
     `"S2 El nom que toqui"`). És el nom de la pestanya que es crearà sola
     al full de càlcul la primera vegada que algú entregui aquesta fitxa.
     Si poses el mateix nom que ja existeix en una altra sessió, les
     entregues es barrejaran a la mateixa pestanya — assegura't que sigui
     diferent per cada una.
   - `ambSolucions`: `false` mentre els alumnes hi treballen.
   - `opcions`: la llista de respostes possibles per als desplegables d'aquesta
     sessió (no cal que sigui la mateixa que la S1).
   - `titols`: un nom curt per a cada activitat, per identificar-la al full de
     càlcul.
5. Afegeix l'enllaç a la sessió nova dins `index.html` (l'arrel del repositori).
6. Puja els canvis (commit + push). GitHub Pages es reconstrueix sola.

## Solucions per al professorat

Cada sessió porta `ambSolucions: false` per defecte: el botó "Mostra la
solució" no existeix enlloc de la pàgina que veu l'alumnat, perquè primer
raonin i ho intentin ells sols.

Quan calgui consultar les solucions (per repassar a classe, per exemple),
cada sessió té una còpia bessona no enllaçada des de l'`index.html` públic:

```
s1-forces-esforcos/
  index.html       ← la que veu l'alumnat (ambSolucions: false)
  solucions.html   ← còpia amb ambSolucions: true, només per al professorat
```

`solucions.html` no té els camps d'identificació ni el botó d'entrega (no té
sentit "entregar" res des d'aquí). Segueix el mateix patró quan facis una
sessió nova: duplica `index.html` a `solucions.html`, posa `ambSolucions:
true` i treu les seccions `identificacio` i `entrega`.

A la pàgina de l'alumnat (`index.html`), l'opció `comprovaDespresEntrega:
true` de `FitxaEngine.init({...})` amaga els botons "Comprova" i "Torna-ho a
provar" de totes les activitats fins que l'alumne entrega la fitxa, perquè
primer ho hagi de raonar sense feedback immediat. En entregar, el motor
corregeix igualment totes les activitats per calcular la nota real que
arriba al full de càlcul, i deixa visible el botó "Comprova" (no el de
"Torna-ho a provar") perquè després puguin repassar què han fallat.

⚠️ **Important**: GitHub Pages publica tot el que hi ha al repositori. Que
`solucions.html` no estigui enllaçat des de l'índex no el fa privat: qui
tingui la URL directa (`.../s1-forces-esforcos/solucions.html`) hi pot
entrar igualment. És prou per evitar que un alumne hi arribi fent clic, però
no per amagar-lo de debò. Si algun dia cal que sigui realment privat, caldria
un repositori privat (Pages amb repo privat requereix GitHub Pro/Team/Enterprise)
o protegir-lo fora de GitHub Pages.

## Codifica-respostes.py

Petita eina perquè no hagis d'amagar les respostes a mà. Li passes un fitxer
HTML amb `data-correcta="X"` escrit en clar i et retorna el mateix fitxer amb
`data-c="<base64>"`. Fes-ho servir just abans de publicar, quan ja no penses
tocar més les respostes:

```
python3 eines/codifica-respostes.py s2-nom-de-la-sessio/index.html
```

Sobreescriu l'arxiu al mateix lloc. Fes-ne una còpia abans si vols conservar
la versió amb les respostes en clar per si has d'editar-la més endavant.

## Full de càlcul de recollida d'entregues

El codi de l'Apps Script (doPost) que rep les entregues de `FitxaEngine` no
viu en aquest repositori, sinó lligat al full de càlcul de Google Sheets on
vulguis rebre-les. Consulta `apps-script-recollida-entregues.gs` (fora
d'aquest repositori, guardat a banda) per al codi i les instruccions de
desplegament.
