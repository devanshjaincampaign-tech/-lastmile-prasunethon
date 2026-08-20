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

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("lastmile-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("lastmile-theme", theme);
  }, [theme]);

  return [theme, setTheme];
}

function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function LastMileBadge() {
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-clay flex items-center justify-center shadow-md shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z" />
      </svg>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useTheme();
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
        <div className="max-w-md bg-paper dark:bg-navyCard rounded-2xl shadow-paper p-6 text-center">
          <p className="text-clay font-semibold mb-2">Setup needed</p>
          <p className="text-sm text-ink/70 dark:text-white/70">{authError}</p>
        </div>
      </div>
    );
  }

  if (!deviceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-navyDark">
        <p className="text-ink/40 dark:text-white/40 text-sm font-body">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-navyDark dot-grid-bg transition-colors">
      <header className="bg-navy text-white px-4 py-3.5 sticky top-0 z-10 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LastMileBadge />
            <div>
              <h1 className="text-xl font-display font-semibold tracking-tight leading-none">
                LastMile
              </h1>
              <p className="text-[10.5px] text-white/55 font-body tracking-wide mt-0.5">
                VERNACULAR AI DOUBT SOLVER
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-body cursor-pointer select-none text-white/80">
              <span className="hidden sm:inline">Classroom</span>
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
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
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
            <h2 className="text-[11px] font-bold text-ink/40 dark:text-white/40 uppercase tracking-widest font-body px-1">
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
            <h2 className="text-[11px] font-bold text-ink/40 dark:text-white/40 uppercase tracking-widest font-body px-1">
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
          <p className="text-center text-sm text-ink/35 dark:text-white/35 font-body pt-10">
            No doubts yet — add one above whenever you get stuck.
          </p>
        )}
      </main>
    </div>
  );
}