// Delad kodruta: Monaco-editor + sandlåda (Web Worker) + snälla felmeddelanden.
// Används av Caesarchiffer och (senare) RSA-utmaningen.

const MONACO_BAS = new URL('../vendor/monaco/', import.meta.url).href;
const TIDSGRANS_MS = 1500;
const FORDROJNING_MS = 400;

let monacoLofte = null;

function laddaMonaco() {
  if (monacoLofte) return monacoLofte;
  monacoLofte = new Promise((klar, fel) => {
    self.MonacoEnvironment = {
      getWorkerUrl() {
        const kod = `self.MonacoEnvironment={baseUrl:'${MONACO_BAS}'};importScripts('${MONACO_BAS}vs/base/worker/workerMain.js');`;
        return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(kod);
      },
    };
    const skript = document.createElement('script');
    skript.src = MONACO_BAS + 'vs/loader.js';
    skript.onload = () => {
      self.require.config({ paths: { vs: MONACO_BAS + 'vs' } });
      self.require(['vs/editor/editor.main'], () => klar(self.monaco), fel);
    };
    skript.onerror = fel;
    document.head.append(skript);
  });
  return monacoLofte;
}

// Koden körs i en Worker så att oändliga loopar inte kan frysa sidan.
const WORKER_KALLA = `
self.onmessage = (e) => {
  const { kod, funktion, indata } = e.data;
  try {
    const fn = new Function(kod + '\\n;return typeof ' + funktion + " === 'function' ? " + funktion + ' : undefined;')();
    if (!fn) { postMessage({ fel: { typ: 'saknas' } }); return; }
    postMessage({ ok: fn(...indata) });
  } catch (err) {
    postMessage({ fel: { typ: err && err.name, meddelande: String(err && err.message) } });
  }
};`;

const workerUrl = URL.createObjectURL(new Blob([WORKER_KALLA], { type: 'text/javascript' }));

function kor(kod, funktion, indata) {
  return new Promise((klar) => {
    const worker = new Worker(workerUrl);
    const timer = setTimeout(() => {
      worker.terminate();
      klar({ fel: { typ: 'tidsgrans' } });
    }, TIDSGRANS_MS);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      klar(e.data);
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      klar({ fel: { typ: 'Error', meddelande: '' } });
    };
    try {
      worker.postMessage({ kod, funktion, indata });
    } catch {
      clearTimeout(timer);
      worker.terminate();
      klar({ fel: { typ: 'Error', meddelande: '' } });
    }
  });
}

// Översätter JavaScript-fel till något ett barn kan förstå.
function snallt(fel, funktion) {
  const m = fel.meddelande || '';
  switch (fel.typ) {
    case 'saknas':
      return `Hoppsan! Jag hittar ingen funktion som heter "${funktion}". Har du tagit bort den av misstag? Tryck på "Börja om".`;
    case 'tidsgrans':
      return 'Hoppsan! Din kod tar för lång tid. Kanske en loop som aldrig tar slut?';
    case 'SyntaxError':
      if (/token|string|unterminated/i.test(m)) {
        return 'Hoppsan! Kolla att du har citattecken (") runt bokstäverna, och att alla citattecken har ett par.';
      }
      if (/Unexpected end|missing|Expected/i.test(m)) {
        return 'Hoppsan! Något saknas. Har du glömt en parentes ), en klammer } eller ett semikolon ;?';
      }
      return 'Hoppsan! Datorn förstår inte din kod. Kolla stavningen och alla parenteser och citattecken.';
    case 'ReferenceError': {
      const namn = /^(\S+) is not defined/.exec(m);
      return namn
        ? `Hoppsan! Datorn känner inte till "${namn[1]}". Har du stavat rätt? Stora och små bokstäver spelar roll!`
        : 'Hoppsan! Datorn känner inte till ett av namnen du skrivit. Kolla stavningen!';
    }
    case 'TypeError':
      return 'Hoppsan! Något är fel typ, till exempel text där det borde vara ett tal. Kolla vad du ändrat.';
    case 'RangeError':
      return 'Hoppsan! Ett tal blev för stort eller något upprepades för många gånger.';
    default:
      return 'Hoppsan! Något gick fel i koden. Kolla vad du ändrade senast, eller tryck på "Börja om".';
  }
}

/**
 * Skapar en kodruta.
 * @param {object} val
 * @param {HTMLElement} val.element        där editorn ska ritas
 * @param {string} val.startkod            koden som visas från början
 * @param {string} val.funktion            namnet på funktionen som ska anropas
 * @param {() => any[]} val.hamtaIndata    argument till funktionen
 * @param {(resultat: any) => void} val.vidResultat  anropas bara när koden gick bra
 * @param {(meddelande: string|null) => void} val.vidFel  felmeddelande, eller null när allt är bra
 */
export async function skapaKodruta({ element, startkod, funktion, hamtaIndata, vidResultat, vidFel }) {
  const monaco = await laddaMonaco();

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  const editor = monaco.editor.create(element, {
    value: startkod,
    language: 'javascript',
    theme: 'vs',
    fontSize: 18,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    tabSize: 2,
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    parameterHints: { enabled: false },
    wordBasedSuggestions: 'off',
  });

  let lopnummer = 0;
  async function kors() {
    const mitt = ++lopnummer;
    const svar = await kor(editor.getValue(), funktion, hamtaIndata());
    if (mitt !== lopnummer) return; // ett nyare körning har startat
    if (svar.fel) {
      vidFel(snallt(svar.fel, funktion));
    } else {
      vidFel(null);
      vidResultat(svar.ok);
    }
  }

  let timer;
  editor.onDidChangeModelContent(() => {
    clearTimeout(timer);
    timer = setTimeout(kors, FORDROJNING_MS);
  });

  kors();

  return {
    kor: kors,
    aterstall() {
      editor.setValue(startkod);
    },
  };
}
