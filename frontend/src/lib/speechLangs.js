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
 * True if this browser currently has an installed voice matching the given
 * BCP-47 language (checked by language-prefix, e.g. "ta" for "ta-IN").
 * Returns true (optimistically) if the voice list hasn't loaded yet, so the
 * Listen button doesn't flicker to "unavailable" before Chrome's async
 * voice list populates — replaces the old hardcoded LIMITED_VOICE_SUPPORT
 * guess-list with a real per-device check.
 */
export function voiceAvailableFor(bcp47) {
  if (!speechSynthesisSupported()) return false;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return true;
  const prefix = bcp47.split("-")[0].toLowerCase();
  return voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
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