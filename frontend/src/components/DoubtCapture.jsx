import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSpeechRecognitionCtor, speechRecognitionSupported, toBcp47, hasLimitedVoiceSupport } from "../lib/speechLangs.js";

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
  preferredLanguage,
  setPreferredLanguage,
  uiLanguage,
  copy,
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedPreview, setCapturedPreview] = useState("");
  const [capturedFile, setCapturedFile] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef(""); // text already in the box before this voice session started
  const voiceSupported = speechRecognitionSupported();
  const limitedVoice = hasLimitedVoiceSupport(preferredLanguage);

  // Stop any in-progress recognition if the component unmounts mid-listen.
  useEffect(() => () => recognitionRef.current?.stop(), []);

  function startListening() {
    if (!voiceSupported || listening || busy) return;
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = toBcp47(preferredLanguage);
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    baseTextRef.current = text ? `${text} ` : "";
    setVoiceError("");
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final) baseTextRef.current += final;
      setText(baseTextRef.current + interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError("Microphone access was blocked. Allow mic permission to use voice input.");
      } else if (event.error === "no-speech") {
        setVoiceError("Didn't catch that — try again.");
      } else if (event.error === "network") {
        setVoiceError("Voice input needs an internet connection.");
      } else {
        setVoiceError("Voice input isn't working right now. Try typing instead.");
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      setListening(true);
    } catch (error) {
      console.error("Could not start speech recognition:", error);
      setListening(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function releaseCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function stopCamera() {
    releaseCameraStream();
    setCameraOpen(false);
    setCapturedPreview("");
    setCapturedFile(null);
  }

  useEffect(() => stopCamera, []);

  async function openCamera() {
    setCameraError("");
    setCapturedPreview("");
    setCapturedFile(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported in this browser. Use Upload image instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (error) {
      console.error("Camera access failed:", error);
      setCameraError("Camera access was blocked. Allow camera permission or use Upload image instead.");
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error("Could not capture the camera image.");
      const file = new File([blob], "camera-doubt.jpg", { type: "image/jpeg" });
      setCapturedFile(file);
      setCapturedPreview(canvas.toDataURL("image/jpeg", 0.85));
      releaseCameraStream();
    } catch (error) {
      console.error("Photo capture failed:", error);
      setCameraError("Could not capture this photo. Please try again or upload an image.");
    } finally {
      setBusy(false);
    }
  }

  async function useCapturedPhoto() {
    if (!capturedFile) return;
    setBusy(true);
    try {
      const { base64, mimeType } = await compressImageToBase64(capturedFile);
      await onAddImage(base64, mimeType, preferredLanguage);
      stopCamera();
    } catch (error) {
      console.error("Captured photo upload failed:", error);
      setCameraError("Could not add this photo. Please retake it or upload an image.");
    } finally {
      setBusy(false);
    }
  }

  function retakePhoto() {
    setCapturedPreview("");
    setCapturedFile(null);
    openCamera();
  }

  async function handleAddText() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onAddText(text.trim(), preferredLanguage);
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
      await onAddImage(base64, mimeType, preferredLanguage);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <div className="glass-composer rounded-2xl border border-white/[0.14] shadow-2xl shadow-black/25 overflow-hidden">
      <div className="p-4 space-y-3">
        {classroomMode && (
          <input
            type="text"
            placeholder="Student name (for this doubt)"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-body text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-mint/40"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
          <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35" htmlFor="answer-language">
            {copy.answerLanguage}
          </label>
          <select
            id="answer-language"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="language-select rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white/75 outline-none focus:ring-2 focus:ring-mint/40"
          >
            <option value="auto">{copy.autoDetect}</option>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="hinglish">Hinglish</option>
            <option value="bhojpuri">Bhojpuri</option>
            <option value="maithili">Maithili</option>
            <option value="assamese">Assamese</option>
            <option value="bengali">Bengali</option>
            <option value="bodo">Bodo</option>
            <option value="dogri">Dogri</option>
            <option value="gujarati">Gujarati</option>
            <option value="kannada">Kannada</option>
            <option value="kashmiri">Kashmiri</option>
            <option value="konkani">Konkani</option>
            <option value="malayalam">Malayalam</option>
            <option value="manipuri">Manipuri</option>
            <option value="marathi">Marathi</option>
            <option value="nepali">Nepali</option>
            <option value="odia">Odia</option>
            <option value="punjabi">Punjabi</option>
            <option value="sanskrit">Sanskrit</option>
            <option value="santali">Santali</option>
            <option value="sindhi">Sindhi</option>
            <option value="tamil">Tamil</option>
            <option value="telugu">Telugu</option>
            <option value="urdu">Urdu</option>
          </select>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.askPlaceholder}
            rows={5}
            className={`w-full bg-transparent px-2 py-2.5 ${voiceSupported ? "pr-11" : ""} text-[16px] font-body text-white placeholder:text-white/35 resize-none focus:outline-none`}
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={busy}
                title={limitedVoice ? "Voice recognition for this language is limited — pronunciation accuracy may be rough" : copy.voiceInput}              className={`absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-35 ${
                listening
                  ? "bg-rose text-shell animate-pulse"
                  : "bg-white/[0.08] text-white/70 hover:bg-white/15 hover:text-white"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            </button>
          )}
        </div>
        {listening && (
          <p className="flex items-center gap-1.5 px-2 text-xs font-semibold text-rose">
            <span className="h-1.5 w-1.5 rounded-full bg-rose animate-pulse" />
            {copy.listeningNow}
          </p>
        )}
        {voiceError && <p className="px-2 text-xs text-rose">{voiceError}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddText}
            disabled={busy || !text.trim()}
            className="min-w-[9rem] flex-1 bg-mint text-shell rounded-lg py-2.5 text-sm font-semibold tracking-tight disabled:opacity-35 hover:bg-mint/90 active:scale-[0.99] transition"
          >
            {copy.addLater}
          </button>

          <button
            onClick={openCamera}
            disabled={busy}
            className="min-w-[6.5rem] flex-1 bg-white/[0.06] text-white border border-white/10 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-35 hover:bg-white/10 active:scale-[0.99] transition flex items-center justify-center gap-1.5"
            title="Take a photo of a handwritten doubt"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {copy.takePhoto}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="min-w-[6.5rem] flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-35"
          >
            {copy.uploadImage}
          </button>
          <input id="camera-input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {cameraError && <p className="basis-full px-1 text-xs text-rose">{cameraError}</p>}
        </div>
      </div>

      </div>
      {cameraOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#171716] p-4 shadow-2xl shadow-black/50 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-white">{capturedPreview ? copy.reviewPhoto : copy.camera}</p>
                <p className="mt-1 text-xs text-white/45">{capturedPreview ? copy.reviewHint : copy.cameraHint}</p>
              </div>
              <button onClick={stopCamera} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl leading-none text-white hover:bg-white/20 disabled:opacity-50" aria-label={copy.close}>&times;</button>
            </div>
            {capturedPreview ? (
              <img src={capturedPreview} alt="Captured doubt preview" className="max-h-[62vh] min-h-[240px] w-full rounded-xl bg-black object-contain" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="max-h-[62vh] min-h-[240px] w-full rounded-xl bg-black object-cover" />
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              {capturedPreview ? (
                <>
                  <button onClick={retakePhoto} disabled={busy} className="order-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 sm:order-1">{copy.retake}</button>
                  <button onClick={useCapturedPhoto} disabled={busy} className="order-1 rounded-lg bg-mint px-5 py-3 text-sm font-bold text-shell disabled:opacity-50 sm:order-2">{busy ? copy.addingPhoto : copy.usePhoto}</button>
                </>
              ) : (
                <>
                  <button onClick={stopCamera} disabled={busy} className="order-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 sm:order-1">{copy.back}</button>
                  <button onClick={capturePhoto} disabled={busy} className="order-1 rounded-lg bg-mint px-5 py-3 text-sm font-bold text-shell disabled:opacity-50 sm:order-2">{busy ? copy.processing : copy.capturePhoto}</button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}