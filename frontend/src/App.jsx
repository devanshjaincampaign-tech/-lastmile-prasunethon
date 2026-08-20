import { useEffect, useState, useMemo } from "react";
import { ensureAnonymousAuth } from "./lib/firebase.js";
import {
  subscribeToDoubts,
  addTextDoubt,
  addImageDoubt,
  markSolved,
  markError,
  updateSimplifiedAnswer,
  deleteDoubt,
} from "./lib/doubtsStore.js";
import { solveDoubts, simplifyDoubt } from "./lib/api.js";
import DoubtCapture from "./components/DoubtCapture.jsx";
import AnswerCard from "./components/AnswerCard.jsx";

export default function App() {
  const [deviceId, setDeviceId] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [classroomMode, setClassroomMode] = useState(false);
  const [studentName, setStudentName] = useState("Self");
  const [solving, setSolving] = useState(false);
  const [simplifyingId, setSimplifyingId] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    ensureAnonymousAuth()
      .then(setDeviceId)
      .catch((err) => {
        console.error("Auth failed:", err);
        setAuthError(
          "Could not connect to Firebase. Check that your .env values are correct and Anonymous auth is enabled in the Firebase console."
        );
      });
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    const unsubscribe = subscribeToDoubts(deviceId, setDoubts);
    return unsubscribe;
  }, [deviceId]);

  const pending = useMemo(() => doubts.filter((d) => d.status === "pending"), [doubts]);
  const solvedOrError = useMemo(
    () => doubts.filter((d) => d.status === "solved" || d.status === "error").reverse(),
    [doubts]
  );

  async function handleAddText(text) {
    await addTextDoubt(deviceId, text, classroomMode ? studentName : "Self");
  }

  async function handleAddImage(base64, mimeType) {
    await addImageDoubt(deviceId, base64, mimeType, classroomMode ? studentName : "Self");
  }

  async function handleSolveSession() {
    if (pending.length === 0) return;
    setSolving(true);
    try {
      const results = await solveDoubts(pending);
      for (const r of results) {
        if (r.status === "solved") {
          await markSolved(deviceId, r.id, r.answer, r.subject);
        } else {
          await markError(deviceId, r.id, r.error);
        }
      }
    } catch (err) {
      console.error("Solve session failed:", err);
      alert(
        "Couldn't reach the solving server. Is the backend running and is VITE_API_BASE_URL correct?"
      );
    } finally {
      setSolving(false);
    }
  }

  async function handleSimplify(doubt) {
    setSimplifyingId(doubt.id);
    try {
      const simplified = await simplifyDoubt(doubt.content, doubt.answer);
      await updateSimplifiedAnswer(deviceId, doubt.id, simplified);
    } catch (err) {
      console.error("Simplify failed:", err);
      alert("Couldn't simplify this answer right now.");
    } finally {
      setSimplifyingId(null);
    }
  }

  async function handleDelete(doubtId) {
    await deleteDoubt(deviceId, doubtId);
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-navyDark font-body">
        <div className="max-w-md bg-paper rounded-2xl shadow-paper p-6 text-center">
          <p className="text-clay font-semibold mb-2">Setup needed</p>
          <p className="text-sm text-ink/70">{authError}</p>
        </div>
      </div>
    );
  }

  if (!deviceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navyDark">
        <p className="text-white/40 text-sm font-body">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navyDark">
      <header className="bg-navy text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight">LastMile</h1>
            <p className="text-[11px] text-white/60 font-body tracking-wide">
              VERNACULAR AI DOUBT SOLVER
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-body cursor-pointer select-none text-white/80">
            <span>Classroom Mode</span>
            <span className="relative inline-block w-9 h-5">
              <input
                type="checkbox"
                checked={classroomMode}
                onChange={(e) => setClassroomMode(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-white/20 peer-checked:bg-accent transition-colors" />
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-5 pb-14">
        <DoubtCapture
          onAddText={handleAddText}
          onAddImage={handleAddImage}
          classroomMode={classroomMode}
          studentName={studentName}
          setStudentName={setStudentName}
        />

        {pending.length > 0 && (
          <button
            onClick={handleSolveSession}
            disabled={solving}
            className={`w-full bg-accent text-white rounded-2xl py-3.5 font-display font-semibold text-[15px] tracking-tight disabled:opacity-60 hover:brightness-105 active:scale-[0.99] transition ${
              solving ? "" : "animate-pulseglow"
            }`}
          >
            {solving
              ? `Solving ${pending.length} doubt${pending.length > 1 ? "s" : ""}...`
              : `Solve My ${pending.length} Doubt${pending.length > 1 ? "s" : ""}`}
          </button>
        )}

        {pending.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest font-body px-1">
              Pending &middot; {pending.length}
            </h2>
            <div className="space-y-2.5">
              {pending.map((d) => (
                <AnswerCard key={d.id} doubt={d} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        )}

        {solvedOrError.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-widest font-body px-1">
              Answered &middot; {solvedOrError.length}
            </h2>
            <div className="space-y-2.5">
              {solvedOrError.map((d) => (
                <AnswerCard
                  key={d.id}
                  doubt={d}
                  onSimplify={handleSimplify}
                  onDelete={handleDelete}
                  simplifying={simplifyingId === d.id}
                />
              ))}
            </div>
          </section>
        )}

        {doubts.length === 0 && (
          <p className="text-center text-sm text-white/35 font-body pt-10">
            No doubts yet — add one above whenever you get stuck.
          </p>
        )}
      </main>
    </div>
  );
}