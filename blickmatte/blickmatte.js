import { nyUppgift } from './uppgifter.js';
import { startaBlick, visaKamera, visaBlickpunkt, glomKalibrering } from './blick.js';

const DWELL_MS = 1000;          // så länge man ska titta för att svara
const AVKLING = 2;              // ringen töms så här många gånger snabbare än den fylls
const TRAFFMARGINAL_PX = 30;    // blicken är ungefärlig, så rutorna får extra marginal
const GLATTNING = 0.3;          // 0–1, högre = snabbare men darrigare blickpunkt
const TYST_EFTER_MS = 1500;     // så länge utan ansikte innan vi varnar
const KLICK_PER_PRICK = 5;
const PAUS_EFTER_SVAR_MS = 2200;
const KAL_PUNKTER = [
  [8, 10], [50, 10], [92, 10],
  [8, 50], [50, 50], [92, 50],
  [8, 90], [50, 90], [92, 90],
];

const el = (id) => document.getElementById(id);
const startSida = el('start');
const kalSida = el('kalibrera');
const spelSida = el('spel');

let lage = 'mus';           // 'blick' | 'mus'
let blickpunktPa = false;

// ---------- Start ----------

function visaStartfel(text) {
  el('startfel').textContent = text;
}

el('starta-mus').addEventListener('click', () => {
  lage = 'mus';
  startaSpel();
});

el('starta-blick').addEventListener('click', async () => {
  visaStartfel('');
  const knapp = el('starta-blick');
  knapp.disabled = true;
  knapp.textContent = '⏳ Startar kameran…';
  try {
    await startaBlick(vidBlick);
    lage = 'blick';
    await kalibrera();
    startaSpel();
  } catch (err) {
    visaStartfel(kamerafel(err));
  } finally {
    knapp.disabled = false;
    knapp.textContent = '👀 Starta med blicken';
  }
});

function kamerafel(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Du behöver tillåta kameran. Klicka på kameraikonen i adressfältet och välj "Tillåt", försök sedan igen. Du kan också spela med musen.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Jag hittar ingen kamera på den här datorn. Du kan spela med musen istället.';
    case 'NotReadableError':
      return 'Kameran används av något annat program. Stäng det och försök igen.';
    default:
      return 'Hoppsan! Det gick inte att starta kameran. Du kan spela med musen istället.';
  }
}

// ---------- Kalibrering ----------

function kalibrera() {
  visaKamera(true);
  startSida.hidden = true;
  spelSida.hidden = true;
  kalSida.hidden = false;
  return new Promise((klar) => {
    let index = 0;

    function nastaPrick() {
      if (index >= KAL_PUNKTER.length) {
        kalSida.hidden = true;
        visaKamera(false);
        klar();
        return;
      }
      const [x, y] = KAL_PUNKTER[index];
      const prick = document.createElement('button');
      prick.className = 'pricken';
      prick.type = 'button';
      prick.style.left = `${x}%`;
      prick.style.top = `${y}%`;
      prick.setAttribute('aria-label', 'Kalibreringsprick');
      let klick = 0;
      prick.textContent = String(KLICK_PER_PRICK);
      prick.addEventListener('click', () => {
        klick++;
        prick.textContent = String(KLICK_PER_PRICK - klick);
        if (klick >= KLICK_PER_PRICK) {
          prick.remove();
          index++;
          setTimeout(nastaPrick, 250);
        }
      });
      kalSida.append(prick);
    }
    nastaPrick();
  });
}

el('kalibrera-om').addEventListener('click', async () => {
  if (lage !== 'blick') {
    // Musläge: erbjud inte kalibrering, byt till blick via startsidan
    spelSida.hidden = true;
    startSida.hidden = false;
    return;
  }
  spelad = false;
  await glomKalibrering();
  await kalibrera();
  spelSida.hidden = false;
  spelad = true;
});

// ---------- Blick och pekare ----------

let punkt = null;       // senaste (utjämnade) punkt i fönsterkoordinater
let sistSettMs = 0;

function vidBlick(rå) {
  const nu = performance.now();
  if (!rå) {
    return; // tid utan ansikte hanteras i tick()
  }
  sistSettMs = nu;
  punkt = punkt
    ? { x: punkt.x + GLATTNING * (rå.x - punkt.x), y: punkt.y + GLATTNING * (rå.y - punkt.y) }
    : { ...rå };
}

document.addEventListener('mousemove', (e) => {
  if (lage === 'mus') {
    punkt = { x: e.clientX, y: e.clientY };
    sistSettMs = performance.now();
  }
});

el('blickpunkt').addEventListener('click', () => {
  blickpunktPa = !blickpunktPa;
  visaBlickpunkt(blickpunktPa);
  el('blickpunkt').textContent = blickpunktPa ? '⚪ Dölj blickpunkt' : '🔴 Visa blickpunkt';
});

// ---------- Spelet ----------

let spelad = false;
let laser = false;      // true medan vi visar rätt/fel
let uppgift = null;
let streck = 0;
let framsteg = [];      // ms ihållande blick per ruta
let sistaTick = 0;
let slingaIgang = false;

const svarsrad = el('svarsrad');

function startaSpel() {
  startSida.hidden = true;
  spelSida.hidden = false;
  el('lage').textContent = lage === 'blick'
    ? 'Titta på rätt svar i 1 sekund!'
    : 'Håll musen över rätt svar i 1 sekund – eller klicka!';
  el('blickpunkt').hidden = lage !== 'blick';
  el('kalibrera-om').textContent = lage === 'blick' ? '🎯 Kalibrera om' : '👀 Byt till blick';
  streck = 0;
  uppdateraStreck(false);
  nastaFraga();
  spelad = true;
  sistaTick = performance.now();
  if (!slingaIgang) {
    slingaIgang = true;
    requestAnimationFrame(tick);
  }
}

function nastaFraga() {
  uppgift = nyUppgift(uppgift?.text);
  el('fraga').textContent = `${uppgift.text} = ?`;
  el('aterkoppling').textContent = '';
  framsteg = uppgift.alternativ.map(() => 0);
  svarsrad.replaceChildren(...uppgift.alternativ.map((tal, i) => {
    const ruta = document.createElement('button');
    ruta.type = 'button';
    ruta.className = 'svar';
    ruta.innerHTML = '<div class="fyllning"></div><div class="ring"></div><span class="tal"></span>';
    ruta.querySelector('.tal').textContent = String(tal);
    ruta.addEventListener('click', () => {
      if (lage === 'mus') svara(i); // vid blickstyrning svarar man bara med blicken
    });
    return ruta;
  }));
  laser = false;
}

function uppdateraStreck(hoppa) {
  el('streck-tal').textContent = String(streck);
  const ruta = el('streck');
  ruta.classList.remove('hopp');
  if (hoppa) {
    void ruta.offsetWidth;
    ruta.classList.add('hopp');
  }
}

function beromma(n) {
  if (n >= 10) return '🏆 Tio i rad! Du är en mattestjärna!';
  if (n >= 5) return '🌟 Fem i rad! Fantastiskt!';
  if (n >= 3) return '🔥 Tre i rad! Du är på gång!';
  return '🎉 Rätt!';
}

function svara(index) {
  if (laser) return;
  laser = true;
  const rutor = [...svarsrad.children];
  const ratt = uppgift.alternativ[index] === uppgift.svar;
  const rattIndex = uppgift.alternativ.indexOf(uppgift.svar);
  rutor[rattIndex].classList.add('ratt');
  if (ratt) {
    streck++;
    uppdateraStreck(true);
    el('aterkoppling').textContent = beromma(streck);
  } else {
    rutor[index].classList.add('fel');
    streck = 0;
    uppdateraStreck(false);
    el('aterkoppling').textContent = `Nästan! Rätta svaret är ${uppgift.svar}. Försök med nästa!`;
  }
  setTimeout(nastaFraga, PAUS_EFTER_SVAR_MS);
}

function rutaUnderPunkt() {
  if (!punkt) return -1;
  const rutor = [...svarsrad.children];
  return rutor.findIndex((r) => {
    const b = r.getBoundingClientRect();
    return punkt.x >= b.left - TRAFFMARGINAL_PX && punkt.x <= b.right + TRAFFMARGINAL_PX
        && punkt.y >= b.top - TRAFFMARGINAL_PX && punkt.y <= b.bottom + TRAFFMARGINAL_PX;
  });
}

function tick(nu) {
  if (!spelad) {
    requestAnimationFrame(tick);
    return;
  }
  const dt = Math.min(nu - sistaTick, 100);
  sistaTick = nu;

  // Syns inget ansikte på ett tag?
  const saknas = lage === 'blick' && nu - sistSettMs > TYST_EFTER_MS;
  el('varning').textContent = saknas ? '👀 Jag ser inte ditt ansikte. Titta in i kameran!' : '';

  const under = (!laser && !saknas) ? rutaUnderPunkt() : -1;
  const rutor = [...svarsrad.children];
  let fardig = -1;
  framsteg.forEach((ms, i) => {
    framsteg[i] = i === under ? ms + dt : Math.max(0, ms - dt * AVKLING);
    const andel = Math.min(framsteg[i] / DWELL_MS, 1);
    rutor[i]?.style.setProperty('--p', andel);
    const fyllning = rutor[i]?.querySelector('.fyllning');
    if (fyllning) fyllning.style.height = `${andel * 100}%`;
    if (andel >= 1) fardig = i;
  });
  if (fardig >= 0) svara(fardig);

  requestAnimationFrame(tick);
}
