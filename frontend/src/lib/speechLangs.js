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

// Languages in the app's selector that have no dedicated STT/TTS locale on
// any browser today — they're routed to a proxy language above (Hindi,
// Urdu, or Marathi). Voice will still work for these, but pronunciation
// and recognition accuracy will be noticeably rougher than for a language
// with real native support. The UI should set honest expectations for
// these rather than presenting voice as equally reliable everywhere.
const LIMITED_VOICE_SUPPORT = new Set([
  "bhojpuri", "maithili", "bodo", "dogri", "konkani",
  "manipuri", "sanskrit", "santali", "kashmiri", "sindhi",
]);

export function hasLimitedVoiceSupport(languageKey) {
  return LIMITED_VOICE_SUPPORT.has(languageKey);
}

/** True if this browser has any native speech-recognition support. */
export function speechRecognitionSupported() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/** True if this browser has any native speech-synthesis (TTS) support. */
export function speechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Returns the SpeechRecognition constructor for this browser, or null. */
export function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Picks the best available TTS voice for a given BCP-47 language, waiting
 * briefly for the browser's (async, sometimes slow-to-populate) voice list
 * if it hasn't loaded yet. Resolves to null if nothing matches — the
 * browser will still use its default voice as long as utterance.lang is set.
 */
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