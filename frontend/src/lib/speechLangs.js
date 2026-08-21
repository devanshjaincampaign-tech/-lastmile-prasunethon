const BCP47 = {
  auto: "en-IN",
  english: "en-IN",
  hindi: "hi-IN",
  hinglish: "en-IN",
  bhojpuri: "hi-IN",
  maithili: "hi-IN",
  assamese: "as-IN",
  bengali: "bn-IN",
  bodo: "hi-IN",
  dogri: "hi-IN",
  gujarati: "gu-IN",
  kannada: "kn-IN",
  kashmiri: "ur-IN",
  konkani: "mr-IN",
  malayalam: "ml-IN",
  manipuri: "bn-IN",
  marathi: "mr-IN",
  nepali: "ne-NP",
  odia: "or-IN",
  punjabi: "pa-IN",
  sanskrit: "hi-IN",
  santali: "hi-IN",
  sindhi: "ur-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  urdu: "ur-IN",
};

export function toBcp47(languageKey) {
  return BCP47[languageKey] || "en-IN";
}

export function speechRecognitionSupported() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function speechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function pickVoice(bcp47) {
  return new Promise((resolve) => {
    if (!speechSynthesisSupported()) return resolve(null);

    function choose() {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      const exact = voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase());
      if (exact) return exact;
      const prefix = bcp47.split("-")[0].toLowerCase();
      const partial = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      return partial || null;
    }

    const existing = choose();
    if (existing) return resolve(existing);

    let settled = false;
    const prevHandler = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = () => {
      if (settled) return;
      settled = true;
      resolve(choose());
      window.speechSynthesis.onvoiceschanged = prevHandler || null;
    };
    setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(choose());
    }, 800);
  });
}