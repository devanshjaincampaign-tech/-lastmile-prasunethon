// frontend/src/components/AnswerCard.jsx
import { useEffect, useRef, useState } from "react";
import {
  speechSynthesisSupported,
  toBcp47,
  pickVoice,
  hasLimitedVoiceSupport,
} from "../lib/speechLangs.js";

const STATUS_ACCENT = {
  pending: "border-l-mint",
  solved: "border-l-mint",
  error: "border-l-rose",
};

export default function AnswerCard({ doubt, onSimplify, onDelete, onRetry, simplifying, retrying, copy, classroomMode }) {
  const isPending = doubt.status === "pending";
  const isError = doubt.status === "error";
  const isSolved = doubt.status === "solved";
  const answerHistory = doubt.answerHistory || [];
  const needsReview = Boolean(doubt.needsTeacherReview) && doubt.confidence !== "high";

  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const ttsSupported = speechSynthesisSupported();
  const limitedVoice = hasLimitedVoiceSupport(doubt.preferredLanguage);

  // If this card is speaking and gets unmounted (e.g. the doubt is
  // deleted), cancel that utterance rather than let it keep talking.
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function handleListen() {
    if (!ttsSupported || !doubt.answer) return;

    // Only one answer should ever be speaking at a time across the whole
    // app — cancel anything else in progress before starting this one.
    window.speechSynthesis.cancel();

    if (speaking) {
      // We were the one speaking — cancel() above already stopped us.
      setSpeaking(false);
      utteranceRef.current = null;
      return;
    }

    const bcp47 = toBcp47(doubt.preferredLanguage);
    const utterance = new SpeechSynthesisUtterance(doubt.answer);
    utterance.lang = bcp47;
    utterance.rate = 0.95;

    const voice = await pickVoice(bcp47);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = (event) => {
      // "interrupted"/"canceled" fire naturally when we cancel() to switch
      // cards or the user taps Stop — not real errors, so stay quiet.
      if (event.error !== "interrupted" && event.error !== "canceled") {
        console.error("Speech synthesis error:", event.error);
      }
      setSpeaking(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
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
        <p className="text-sm text-mint font-semibold font-body flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
          Waiting to be solved
        </p>
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
          {needsReview && (
            <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3.5 py-3 text-sm text-amber-100">
              <p className="font-semibold">{classroomMode ? "Needs teacher review" : "Please verify this explanation"}</p>
              <p className="mt-1 text-xs opacity-80">{doubt.reviewReason || "The question or image may be ambiguous."}</p>
              {classroomMode && <p className="mt-1 text-xs font-medium">This is a draft, not a final answer.</p>}
            </div>
          )}
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

            {ttsSupported && (
              <button
                onClick={handleListen}
                className={`flex items-center gap-1.5 text-xs font-semibold font-body transition ${
                  speaking ? "text-rose" : "text-white/55 hover:text-white"
                }`}
                title={limitedVoice ? "Voice support for this language is limited — pronunciation may be rough" : undefined}
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
                {limitedVoice && !speaking && <span className="text-white/25">*</span>}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}