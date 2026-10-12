import { skapaKodruta } from '../js/kodruta.js';

const STARTKOD = `// Alfabetet vi använder (29 bokstäver)
const alfabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ";

// Hur många steg varje bokstav flyttas
const skift = 3;

function kryptera(text) {
  let svar = "";

  // Gå igenom meddelandet, en bokstav i taget
  for (const tecken of text.toUpperCase()) {
    // Var i alfabetet står bokstaven? (-1 betyder att den inte finns)
    const plats = alfabet.indexOf(tecken);

    if (plats === -1) {
      // Mellanslag och tecken som . ! ? lämnas som de är
      svar = svar + tecken;
    } else {
      // Flytta "skift" steg. % gör att vi hoppar tillbaka till A efter Ö
      const nyPlats = (plats + skift) % alfabet.length;
      svar = svar + alfabet[nyPlats];
    }
  }

  return svar;
}
`;

const meddelande = document.getElementById('meddelande');
const svar = document.getElementById('svar');
const fel = document.getElementById('fel');

const ruta = await skapaKodruta({
  element: document.getElementById('editor'),
  startkod: STARTKOD,
  funktion: 'kryptera',
  hamtaIndata: () => [meddelande.value],
  // Svaret uppdateras bara när koden fungerar, annars ligger det gamla kvar
  vidResultat: (resultat) => { svar.textContent = String(resultat); },
  vidFel: (text) => {
    fel.textContent = text ?? '';
    fel.classList.toggle('syns', text !== null);
  },
});

meddelande.addEventListener('input', () => ruta.kor());
document.getElementById('borja-om').addEventListener('click', () => ruta.aterstall());
