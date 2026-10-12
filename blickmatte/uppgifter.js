// Skapar mattefrågor med tre svarsalternativ.

export const OMRADE = {
  additionMax: 100,
  subtraktionMax: 100,
  tabellMin: 2,
  tabellMax: 10,
};

const slump = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function blanda(lista) {
  const kopia = [...lista];
  for (let i = kopia.length - 1; i > 0; i--) {
    const j = slump(0, i);
    [kopia[i], kopia[j]] = [kopia[j], kopia[i]];
  }
  return kopia;
}

function addition() {
  const a = slump(2, OMRADE.additionMax - 2);
  const b = slump(2, OMRADE.additionMax - a);
  return { text: `${a} + ${b}`, svar: a + b, tips: [] };
}

function subtraktion() {
  const a = slump(5, OMRADE.subtraktionMax);
  const b = slump(1, a - 1);
  return { text: `${a} − ${b}`, svar: a - b, tips: [] };
}

function multiplikation() {
  const a = slump(OMRADE.tabellMin, OMRADE.tabellMax);
  const b = slump(OMRADE.tabellMin, OMRADE.tabellMax);
  // Vanliga misstag i tabellerna: ett steg fel i ena tabellen
  return { text: `${a} × ${b}`, svar: a * b, tips: [a, b] };
}

const TYPER = [addition, subtraktion, multiplikation];

// Felaktiga men rimliga svar: nära det rätta, eller ett tiotal fel.
function lurasvar(svar, tips) {
  const steg = blanda([-10, -2, -1, 1, 2, 10, ...tips, ...tips.map((t) => -t)]);
  const val = [];
  for (const s of steg) {
    const kandidat = svar + s;
    if (kandidat >= 0 && kandidat !== svar && !val.includes(kandidat)) val.push(kandidat);
    if (val.length === 2) break;
  }
  return val;
}

/** Ger { text, svar, alternativ: [tre tal i slumpad ordning] } */
export function nyUppgift(foregaendeText) {
  let uppgift;
  do {
    uppgift = TYPER[slump(0, TYPER.length - 1)]();
  } while (uppgift.text === foregaendeText);
  return {
    text: uppgift.text,
    svar: uppgift.svar,
    alternativ: blanda([uppgift.svar, ...lurasvar(uppgift.svar, uppgift.tips)]),
  };
}
