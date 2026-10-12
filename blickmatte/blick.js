// Tunt lager runt webgazer.js. Allt sker lokalt i webbläsaren:
// kamerabilden skickas aldrig någonstans och inget sparas.

const FACEMESH_SOKVAG = new URL('../vendor/webgazer/mediapipe/face_mesh', import.meta.url).href;
const SKRIPT = new URL('../vendor/webgazer/webgazer.js', import.meta.url).href;

let wg = null;

function laddaWebgazer() {
  if (window.webgazer) return Promise.resolve(window.webgazer);
  return new Promise((klar, fel) => {
    const skript = document.createElement('script');
    skript.src = SKRIPT;
    skript.onload = () => klar(window.webgazer);
    skript.onerror = () => fel(new Error('webgazer kunde inte laddas'));
    document.head.append(skript);
  });
}

/**
 * Startar kameran och ögonspårningen.
 * @param {(punkt: {x:number,y:number}|null) => void} vidBlick  null när inget ansikte syns
 * @throws kamerafel (t.ex. NotAllowedError, NotFoundError)
 */
export async function startaBlick(vidBlick) {
  wg = await laddaWebgazer();
  wg.params.faceMeshSolutionPath = FACEMESH_SOKVAG;
  wg.saveDataAcrossSessions(false); // spara ingenting mellan besök
  wg.setGazeListener((data) => vidBlick(data ? { x: data.x, y: data.y } : null));
  await wg.begin();
  wg.showVideoPreview(true);
  wg.showPredictionPoints(false);
}

export function visaKamera(synlig) {
  wg?.showVideoPreview(synlig);
}

export function visaBlickpunkt(synlig) {
  wg?.showPredictionPoints(synlig);
}

/** Glöm all kalibrering, t.ex. innan man kalibrerar om. */
export async function glomKalibrering() {
  await wg?.clearData();
}

export function stoppaBlick() {
  if (wg) {
    wg.setGazeListener(() => {});
    wg.end();
    wg = null;
  }
}
