import { useState, useRef } from "react";

const MAX_DIMENSION = 1280; // px, longest side
const JPEG_QUALITY = 0.72;

/**
 * Resizes + re-encodes a photo client-side before it ever touches Firestore.
 * Real phone camera photos are commonly 3–10MB — well past Firestore's 1MB
 * per-document limit (this app stores images inline in the doc, see
 * doubtsStore.js) and unnecessarily slow/expensive to send to Gemini.
 * Downscaling to ~1280px on the long side and re-encoding as JPEG typically
 * gets a photo under 150–300KB while staying easily legible for OCR.
 */
function compressImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];

        // Firestore document limit is 1MB total; base64 inflates size by
        // ~33%, so keep the encoded string comfortably under that.
        if (base64.length > 700_000) {
          reject(
            new Error(
              "This photo is too large even after compression. Try a clearer, closer photo of just the problem."
            )
          );
          return;
        }

        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Could not read that image file."));
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
    } catch (err) {
      console.error("Photo capture failed:", err);
      alert(err.message || "Could not process that photo. Please try another one.");
    } finally {
      setBusy(false);
      e.target.value = ""; // allow re-selecting the same file later
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      {classroomMode && (
        <input
          type="text"
          placeholder="Student name (for this doubt)"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your doubt here... (Hinglish is totally fine!)"
        rows={3}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/30"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handleAddText}
          disabled={busy || !text.trim()}
          className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40 hover:bg-navyDark transition"
        >
          Add for Later
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition"
          title="Photograph a handwritten doubt"
        >
          📷 Photo
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
  );
}