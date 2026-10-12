# TECNO_3rESO — context del projecte

Fitxes interactives autocorrectives per a Tecnologia i Digitalització, 3r ESO,
Institut del Ter (Catalunya). Publicat amb GitHub Pages.

## Context pedagògic
- Alumnat de 3r ESO (14-15 anys), tres grups. 1 sessió d'aula + 1 de taller per setmana.
- Aquest trimestre (T1) només es qualifiquen CE1 i CE4, amb dos instruments cadascuna.
- "Evidència conjunta" aula+taller només quan el contingut de les dues sessions
  coincideix de veritat la mateixa setmana — mai forçada.
- DUA (Disseny Universal per a l'Aprenentatge): connectar amb exemples propers/reals,
  acceptar diverses formes de resposta, i oferir una "versió amb suport" (un concepte
  alhora, exemple resolt abans de la pràctica) per a qui ho necessiti.
- Notion és només per a planificació del professor. L'alumnat fa servir Google
  (Docs, Sites, Forms, Classroom) i aquestes fitxes en HTML — res més.

## Convencions del repositori
Verifica-les llegint els fitxers reals abans de donar-les per bones; aquest resum
pot quedar-se curt.
- Estructura: assets/estil.css i assets/motor-fitxa.js compartits; una carpeta per
  sessió (s1-forces-esforcos/, s2-estructures/...) amb el seu index.html; index.html
  arrel amb el llistat.
- Cada activitat: `<section class="activitat" data-activitat="aN">`, amb
  `select[data-c]` (resposta correcta en base64) o `input[type=checkbox]` dins `.caselles`.
- Un select pot portar `data-opcions="A|B|C"` per tenir una llista pròpia, diferent
  de la llista global d'`opcions` de `FitxaEngine.init(...)`.
- Les respostes es codifiquen sempre amb `eines/codifica-respostes.py`, mai a mà.
- Imatges: `<img src="imatges/nom.png" onerror="...">` amb un avís de "falta la
  imatge" com a alternativa — mai en inventis una que no existeixi.
- Entrega: un sol full de càlcul + Apps Script per a totes les sessions; el
  paràmetre "activitat" crea la pestanya sola. Per separar respostes puntuables
  de respostes de text lliure (raonaments), es fan dos enviaments amb noms
  d'activitat diferents des de la mateixa pàgina.

## Com treballar-hi
Abans de crear una fitxa nova, llegeix sencers almenys dos exemples existents
per confirmar el patró exacte. Si algun contingut pedagògic concret (quines
preguntes, quines respostes) no queda clar, pregunta-ho — la part tècnica la
pots deduir sol, la part de continguts no.

## Proves (exàmens)
- Motor propi: `assets/motor-prova.js` + `assets/estil-prova.css` (no toquen motor-fitxa.js).
- El contingut de cada prova va XIFRAT (`prova-N/contingut.js`), generat amb
  `eines/xifra-prova.py contingut.json CODI sortida.js NOM_VARIABLE`. El JSON amb les
  preguntes en clar NO es puja mai al repositori (GitHub Pages el publicaria).
- Variants per alumne segons nom+grup; sense feedback ni nota a pantalla; una sola entrega;
  compta sortides de la pàgina (columna "solucions" del full) i minuts (columna "activitats").
- Les respostes obertes s'envien a una segona pestanya («Prova N — Respostes obertes»).
- Cada prova té `index.html` (ordinària) i `versio-suport.html` (pas a pas, xuleta, 🔊 Escolta).
