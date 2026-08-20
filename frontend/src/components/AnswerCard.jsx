// frontend/src/components/AnswerCard.jsx
const STATUS_ACCENT = {
  pending: "border-l-mint",
  solved: "border-l-mint",
  error: "border-l-rose",
};

export default function AnswerCard({ doubt, onSimplify, onDelete, onRetry, simplifying, retrying }) {
  const isPending = doubt.status === "pending";
  const isError = doubt.status === "error";
  const isSolved = doubt.status === "solved";
  const answerHistory = doubt.answerHistory || [];

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
            <span className="text-[11px] text-inkMuted dark:text-white/40 font-body">photo doubt</span>
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
          {answerHistory.map((entry, index) => (
            <div key={`${entry.savedAt || "answer"}-${index}`} className="space-y-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {index === 0 ? "Earlier explanation" : `Previous explanation ${index + 1}`}
              </p>
              <div className="rounded-lg border border-white/[0.06] bg-shell/60 p-3.5 text-[14px] text-white/65 font-body whitespace-pre-wrap leading-relaxed">
                {entry.answer}
              </div>
            </div>
          ))}
          <div className="space-y-2">
            {answerHistory.length > 0 && (
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mint/70">Latest simplified explanation</p>
            )}
            <div className="bg-shell rounded-lg p-3.5 text-[14.5px] text-white/90 font-body whitespace-pre-wrap leading-relaxed">
              {doubt.answer}
            </div>
          </div>
          <button
            onClick={() => onSimplify(doubt)}
            disabled={simplifying}
            className="text-xs font-semibold text-mint hover:text-white disabled:opacity-40 font-body transition"
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