import { skapaKodruta } from '../js/kodruta.js';

// ---------- Del 1: hänglås och nyckel (liknelsen) ----------

const hemlis = document.getElementById('hemlis');
const lada = document.getElementById('lada');
const utfall = document.getElementById('utfall');
const lasKnapp = document.getElementById('las');
const provKnappar = ['olle', 'tjuv', 'maja'].map((id) => document.getElementById(id));

function visa(text, typ = '') {
  utfall.textContent = text;
  utfall.className = typ;
  lada.classList.remove('vippar');
  void lada.offsetWidth; // startar om animationen
  lada.classList.add('vippar');
}

function lasUpp(last) {
  lasKnapp.disabled = last;
  hemlis.disabled = last;
  provKnappar.forEach((k) => { k.disabled = !last; });
}

function borjaOm() {
  lada.textContent = '📦';
  lasUpp(false);
  utfall.textContent = 'Lådan är inte låst än.';
  utfall.className = '';
}

lasKnapp.addEventListener('click', () => {
  if (!hemlis.value.trim()) {
    visa('Skriv ett meddelande först!');
    return;
  }
  lada.textContent = '🔒';
  lasUpp(true);
  visa('Klick! Lådan är låst med Majas hänglås. Nu kan ingen läsa meddelandet – inte ens Olle!');
});

document.getElementById('olle').addEventListener('click', () => {
  visa('Olle har bara hänglåset. Med det kan man bara LÅSA, inte öppna. Lådan är kvar låst! 🔒', 'dalig');
});

document.getElementById('tjuv').addEventListener('click', () => {
  visa('Tjuven har sett hänglåset, men han har inte Majas privata nyckel. Han får inte upp lådan! 🦹❌', 'dalig');
});

document.getElementById('maja').addEventListener('click', () => {
  lada.textContent = '📬';
  visa(`Maja har den privata nyckeln – klick! Lådan öppnas och hon läser: "${hemlis.value}" 🎉`, 'bra');
});

document.getElementById('gor-om').addEventListener('click', borjaOm);

// ---------- Del 2: utmaning med små RSA-tal ----------

const KRYPTERA_START = `// Hänglåset (publikt – alla får veta det)
const n = 33;
const e = 3;

// Mellanslag är plats 0, A är plats 1 ... Ö är plats 29
const alfabet = " ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ";

// Räknar "bas upphöjt till exponent" men behåller bara resten vid delning med modulo.
// Då blir talen aldrig stora.
function potensMod(bas, exponent, modulo) {
  let resultat = 1;
  for (let i = 0; i < exponent; i++) {
    resultat = (resultat * bas) % modulo;
  }
  return resultat;
}

function kryptera(text) {
  const tal = [];

  for (const tecken of text.toUpperCase()) {
    const plats = alfabet.indexOf(tecken);
    if (plats === -1) continue; // hoppa över tecken vi inte kan

    // Lås bokstavens nummer med hänglåset
    tal.push(potensMod(plats, e, n));
  }

  return tal.join(" ");
}
`;

const DEKRYPTERA_START = `// Nyckeln (privat – bara Maja känner till d)
const n = 33;
const d = 7;

const alfabet = " ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ";

function potensMod(bas, exponent, modulo) {
  let resultat = 1;
  for (let i = 0; i < exponent; i++) {
    resultat = (resultat * bas) % modulo;
  }
  return resultat;
}

function dekryptera(kodadeTal) {
  let svar = "";

  // Gör om texten "27 8 ..." till en lista med tal
  const lista = kodadeTal.split(" ").map(Number);

  for (const tal of lista) {
    // Öppna med nyckeln och hitta bokstaven
    const plats = potensMod(tal, d, n);
    svar = svar + alfabet[plats];
  }

  return svar;
}
`;

function visaFel(id) {
  const el = document.getElementById(id);
  return (text) => {
    el.textContent = text ?? '';
    el.classList.toggle('syns', text !== null);
  };
}

const rsaText = document.getElementById('rsa-text');
const tal = document.getElementById('tal');
const oppnat = document.getElementById('oppnat');
let senasteTal = '';
let oppnaRuta;

const krypteraRuta = await skapaKodruta({
  element: document.getElementById('editor-kryptera'),
  startkod: KRYPTERA_START,
  funktion: 'kryptera',
  hamtaIndata: () => [rsaText.value],
  vidResultat: (r) => {
    senasteTal = String(r);
    tal.textContent = senasteTal;
    oppnaRuta?.kor(); // skicka vidare till nyckel-rutan
  },
  vidFel: visaFel('fel-kryptera'),
});

oppnaRuta = await skapaKodruta({
  element: document.getElementById('editor-dekryptera'),
  startkod: DEKRYPTERA_START,
  funktion: 'dekryptera',
  hamtaIndata: () => [senasteTal],
  vidResultat: (r) => {
    // Fel nyckel ger "undefined" för okända platser – visa dem som ?
    oppnat.textContent = String(r).replaceAll('undefined', '?');
  },
  vidFel: visaFel('fel-dekryptera'),
});

rsaText.addEventListener('input', () => krypteraRuta.kor());
document.getElementById('om-kryptera').addEventListener('click', () => krypteraRuta.aterstall());
document.getElementById('om-dekryptera').addEventListener('click', () => oppnaRuta.aterstall());
