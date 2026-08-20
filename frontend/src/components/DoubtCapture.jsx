import { useState, useRef } from "react";

/**
 * Resizes and compresses an image client-side before it ever touches
 * Firestore — keeps documents small since we store images as base64
 * directly (no Firebase Storage / no Blaze plan required).
 */
function compressImageToBase64(file, maxDimension = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DoubtCapture({
  onAddText,
  onAddImage,
  classroomMode,
  studentName,
  setStudentName,
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  async function handleAddText() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onAddText(text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { base64, mimeType } = await compressImageToBase64(file);
      await onAddImage(base64, mimeType);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="bg-paperDim dark:bg-navyCard rounded-2xl shadow-paper dark:shadow-paperDark overflow-hidden">
      <div className="notebook-edge" />
      <div className="p-5 space-y-3">
        {classroomMode && (
          <input
            type="text"
            placeholder="Student name (for this doubt)"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full bg-white/70 dark:bg-white/10 border border-ink/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-body text-ink dark:text-white placeholder:text-inkMuted dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your doubt here... Hinglish is totally fine!"
          rows={4}
          className="ruled-paper w-full bg-white/70 dark:bg-white/[0.06] border border-ink/10 dark:border-white/10 rounded-lg px-3 py-2.5 text-[15px] font-body text-ink dark:text-white placeholder:text-inkMuted dark:placeholder:text-white/35 resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddText}
            disabled={busy || !text.trim()}
            className="flex-1 bg-navy dark:bg-accent text-white rounded-xl py-2.5 text-sm font-semibold tracking-tight disabled:opacity-35 hover:brightness-110 active:scale-[0.99] transition"
          >
            Add for Later
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="bg-white dark:bg-white/10 text-navy dark:text-white border border-navy/15 dark:border-white/20 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-35 hover:bg-navy/5 dark:hover:bg-white/20 active:scale-[0.99] transition flex items-center gap-1.5"
            title="Photograph a handwritten doubt"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}