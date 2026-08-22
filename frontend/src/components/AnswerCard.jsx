// frontend/src/components/AnswerCard.jsx
import { useEffect, useRef, useState } from "react";
import {
  speechSynthesisSupported,
  toBcp47,
  pickVoiceSync,
  voiceAvailableFor,
} from "../lib/speechLangs.js";

const STATUS_ACCENT = {
  pending: "border-l-mint",
  solved: "border-l-mint",
  error: "border-l-rose",
};

export default function AnswerCard({ doubt, onSimplify, onDelete, onRetry, simplifying, retrying, copy }) {
  const isPending = doubt.status === "pending";
  const isError = doubt.status === "error";
  const isSolved = doubt.status === "solved";
  const answerHistory = doubt.answerHistory || [];

  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const ttsSupported = speechSynthesisSupported();
  const bcp47 = toBcp47(doubt.preferredLanguage);

  // Live per-device voice check — re-runs when Chrome's async voice list
  // populates, instead of relying on a hardcoded guess of which languages
  // are "usually" missing a voice.
  const [voiceReady, setVoiceReady] = useState(true);
  useEffect(() => {
    if (!ttsSupported) return;
    const check = () => setVoiceReady(voiceAvailableFor(bcp47));
    check();
    const prevHandler = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = check;
    return () => {
      window.speechSynthesis.onvoiceschanged = prevHandler || null;
    };
  }, [bcp47, ttsSupported]);

  // If this card is speaking and gets unmounted (e.g. the doubt is
  // deleted), cancel that utterance rather than let it keep talking.
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

 function handleListen() {
  if (!ttsSupported || !doubt.answer) return;

  if (speaking) {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    utteranceRef.current = null;
    return;
  }

  window.speechSynthesis.cancel();

  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(doubt.answer);
    utterance.lang = bcp47;
    utterance.rate = 0.95;

    const voice = pickVoiceSync(bcp47);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = (event) => {
      if (event.error !== "interrupted" && event.error !== "canceled") {
        console.error("Speech synthesis error:", event.error);
      }
      setSpeaking(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, 50);

  setSpeaking(true);
}

  const imageSrc =
    doubt.type === "image" && doubt.content
      ? `data:${doubt.mimeType || "image/jpeg"};base64,${doubt.content}`
      : null;

  return (
    <div
      id={`doubt-${doubt.id}`}
      className={`glass-card rounded-xl border border-white/[0.1] border-l-4 ${STATUS_ACCENT[doubt.status] || "border-l-white/20"} p-4 space-y-2.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {doubt.studentName && doubt.studentName !== "Self" && (
            <span className="text-[11px] font-semibold bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-body">
              {doubt.studentName}
            </span>
          )}
          {doubt.subject && (
            <span className="text-[11px] font-medium bg-mint/10 text-mint px-2 py-0.5 rounded-full font-body">
              {doubt.subject}
            </span>
          )}
          {doubt.type === "image" && (
            <span className="text-[11px] text-white/40 font-body">photo doubt</span>
          )}
        </div>
        <button
          onClick={() => onDelete(doubt.id)}
          className="text-white/25 hover:text-rose text-sm leading-none transition"
          title="Remove"
        >
          ✕
        </button>
      </div>

      {imageSrc && (
        <img
          src={imageSrc}
          alt="Handwritten doubt"
          className="rounded-lg max-h-40 object-contain border border-white/10 bg-shell"
        />
      )}

      {doubt.type === "text" && (
        <p className="text-[15px] font-display italic text-white/80 leading-snug">
          "{doubt.content}"
        </p>
      )}

      {isPending && (
        <div className="space-y-2">
          <p className="text-sm text-mint font-semibold font-body flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            Waiting to be solved
          </p>
          <button
            onClick={() => onRetry?.(doubt)}
            disabled={retrying}
            className="text-xs font-semibold text-shell bg-mint hover:brightness-110 disabled:opacity-50 font-body transition px-3 py-1.5 rounded-lg"
          >
            {retrying ? "Solving..." : "Solve Now"}
          </button>
        </div>
      )}

      {isError && (
        <div className="space-y-2">
          <p className="text-sm text-rose font-body">
            {doubt.answer || "Couldn't solve this one."}
          </p>
          <button
            onClick={() => onRetry?.(doubt)}
            disabled={retrying}
            className="text-xs font-semibold text-shell bg-rose hover:brightness-110 disabled:opacity-50 font-body transition px-3 py-1.5 rounded-lg"
          >
            {retrying ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      {isSolved && (
        <>
          {answerHistory.map((entry, index) => (
            <div key={`${entry.savedAt || "answer"}-${index}`} className="space-y-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {index === 0 ? copy.earlierExplanation : `${copy.earlierExplanation} ${index + 1}`}
              </p>
              <div className="rounded-lg border border-white/[0.06] bg-shell/60 p-3.5 text-[14px] text-white/65 font-body whitespace-pre-wrap leading-relaxed">
                {entry.answer}
              </div>
            </div>
          ))}
          <div className="space-y-2">
            {answerHistory.length > 0 && (
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mint/70">{copy.latestSimplified}</p>
            )}
            <div className="bg-shell rounded-lg p-3.5 text-[14.5px] text-white/90 font-body whitespace-pre-wrap leading-relaxed">
              {doubt.answer}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSimplify(doubt)}
              disabled={simplifying}
              className="text-xs font-semibold text-mint hover:text-white disabled:opacity-40 font-body transition"
            >
              {simplifying
                ? copy.simplifying
                : doubt.gradeLevel === "simplified"
                  ? copy.simplify
                  : copy.simplify}
            </button>

            {ttsSupported && voiceReady && (
              <button
                onClick={handleListen}
                className={`flex items-center gap-1.5 text-xs font-semibold font-body transition ${
                  speaking ? "text-rose" : "text-white/55 hover:text-white"
                }`}
              >
                {speaking ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  </svg>
                )}
                {speaking ? copy.stopSpeaking : copy.listen}
              </button>
            )}

            {ttsSupported && !voiceReady && (
              <span
                className="text-xs text-white/30 font-body"
                title="No voice installed on this device for this language"
              >
                {copy.listen} unavailable
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}