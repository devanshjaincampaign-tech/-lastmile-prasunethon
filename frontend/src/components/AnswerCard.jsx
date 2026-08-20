// frontend/src/components/AnswerCard.jsx
const STATUS_ACCENT = {
  pending: "border-l-accent",
  solved: "border-l-sage",
  error: "border-l-clay",
};

export default function AnswerCard({ doubt, onSimplify, onDelete, onRetry, simplifying, retrying }) {
  const isPending = doubt.status === "pending";
  const isError = doubt.status === "error";
  const isSolved = doubt.status === "solved";

  const imageSrc =
    doubt.type === "image" && doubt.content
      ? `data:${doubt.mimeType || "image/jpeg"};base64,${doubt.content}`
      : null;

  return (
    <div
      className={`bg-white dark:bg-navyCard rounded-xl shadow-paper dark:shadow-paperDark border-l-4 ${STATUS_ACCENT[doubt.status] || "border-l-navy/20"} p-4 space-y-2.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {doubt.studentName && doubt.studentName !== "Self" && (
            <span className="text-[11px] font-semibold bg-navy/10 dark:bg-white/10 text-navy dark:text-white/80 px-2 py-0.5 rounded-full font-body">
              {doubt.studentName}
            </span>
          )}
          {doubt.subject && (
            <span className="text-[11px] font-medium bg-accentSoft dark:bg-accent/20 text-accent px-2 py-0.5 rounded-full font-body">
              {doubt.subject}
            </span>
          )}
          {doubt.type === "image" && (
            <span className="text-[11px] text-inkMuted dark:text-white/40 font-body">photo doubt</span>
          )}
        </div>
        <button
          onClick={() => onDelete(doubt.id)}
          className="text-ink/25 dark:text-white/30 hover:text-clay text-sm leading-none transition"
          title="Remove"
        >
          ✕
        </button>
      </div>

      {imageSrc && (
        <img
          src={imageSrc}
          alt="Handwritten doubt"
          className="rounded-lg max-h-40 object-contain border border-ink/10 dark:border-white/10 bg-paper dark:bg-navyDark"
        />
      )}

      {doubt.type === "text" && (
        <p className="text-[15px] font-display italic text-ink/80 dark:text-white/85 leading-snug">
          "{doubt.content}"
        </p>
      )}

      {isPending && (
        <p className="text-sm text-accent font-semibold font-body flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Waiting to be solved
        </p>
      )}

      {isError && (
        <div className="space-y-2">
          <p className="text-sm text-clay dark:text-red-300 font-body">
            {doubt.answer || "Couldn't solve this one."}
          </p>
          <button
            onClick={() => onRetry?.(doubt)}
            disabled={retrying}
            className="text-xs font-semibold text-white bg-clay hover:brightness-110 disabled:opacity-50 font-body transition px-3 py-1.5 rounded-lg"
          >
            {retrying ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}

      {isSolved && (
        <>
          <div className="bg-paper dark:bg-navyDark rounded-lg p-3.5 text-[14.5px] text-ink dark:text-white/90 font-body whitespace-pre-wrap leading-relaxed">
            {doubt.answer}
          </div>
          <button
            onClick={() => onSimplify(doubt)}
            disabled={simplifying}
            className="text-xs font-semibold text-accent hover:text-clay disabled:opacity-40 font-body transition"
          >
            {simplifying
              ? "Simplifying..."
              : doubt.gradeLevel === "simplified"
                ? "Simplify Even More"
                : "Simplify Further"}
          </button>
        </>
      )}
    </div>
  );
}