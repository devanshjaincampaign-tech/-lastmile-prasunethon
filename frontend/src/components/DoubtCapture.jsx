import { useState, useRef } from "react";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is "data:image/jpeg;base64,AAAA..." — strip the prefix
      const base64 = reader.result.split(",")[1];
      resolve({ base64, mimeType: file.type || "image/jpeg" });
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
      const { base64, mimeType } = await fileToBase64(file);
      await onAddImage(base64, mimeType);
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
