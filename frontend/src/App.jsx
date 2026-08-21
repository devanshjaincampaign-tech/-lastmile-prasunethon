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
import StudyCompanion3D from "./components/StudyCompanion3D.jsx";
import { getUiCopy, INTERFACE_LANGUAGES } from "./lib/uiText.js";

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("lastmile-theme");
    if (saved) return saved;
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.classList.toggle("light", theme === "light");
    localStorage.setItem("lastmile-theme", theme);
  }, [theme]);

  return [theme, setTheme];
}

function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-8 w-8 rounded-lg text-white/55 hover:bg-white/10 hover:text-white flex items-center justify-center transition"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-mint">
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
    <div className="last-mile-badge w-9 h-9 rounded-xl bg-mint flex items-center justify-center shadow-md shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3z" />
      </svg>
    </div>
  );
}

function Sidebar({ doubts, pending, classroomMode, setClassroomMode, theme, setTheme, uiLanguage, setUiLanguage, copy, sidebarOpen, setSidebarOpen }) {
  const history = [...doubts].reverse();
  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`glass-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh w-[276px] flex-col overflow-hidden border-r border-white/[0.1] px-3 py-4 transition-transform duration-300 ease-in-out md:z-30 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 -mx-3 mb-5 flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#111110]/75 px-5 pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <LastMileBadge />
            <div>
              <p className="last-mile-wordmark text-[17px] font-semibold tracking-tight text-white">LastMile</p>
              <p className="text-[10px] tracking-[0.18em] text-white/35 uppercase">{copy.learningCompanion}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white transition md:hidden"
              aria-label={copy.close}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="mb-6 flex items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-2.5 text-left text-sm font-medium text-white/90 transition hover:bg-white/[0.13]"><span className="text-lg leading-none">+</span> {copy.newDoubt}</button>
        <div className="mb-2 flex items-center justify-between px-2"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{copy.yourHistory}</span>{pending.length > 0 && <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] text-mint">{pending.length} {copy.open}</span>}</div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {history.length === 0 && <p className="px-2 py-5 text-xs leading-relaxed text-white/30">{copy.historyEmpty}</p>}
          {history.map((doubt) => (
            <button key={doubt.id} onClick={() => { setSidebarOpen(false); document.getElementById(`doubt-${doubt.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.07]">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${doubt.status === "solved" ? "bg-mint" : doubt.status === "error" ? "bg-rose" : "bg-white/35"}`} />
              <span className="line-clamp-2 text-[12px] leading-5 text-white/55 group-hover:text-white/85">{doubt.type === "image" ? copy.photoQuestion : doubt.content}</span>
            </button>
          ))}
        </nav>
        <div className="sticky bottom-0 z-10 -mx-3 mt-4 shrink-0 border-t border-white/[0.08] bg-[#111110]/80 px-3 pt-4 backdrop-blur-xl">
          <label className="classroom-label flex cursor-pointer items-center justify-between px-2 text-xs text-white/55">{copy.classroomMode}<span className="relative inline-block h-5 w-9"><input type="checkbox" checked={classroomMode} onChange={(e) => setClassroomMode(e.target.checked)} className="peer sr-only" /><span className="classroom-track absolute inset-0 rounded-full bg-white/15 peer-checked:bg-mint/70 transition-colors" /><span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" /></span></label>
          <label className="mt-4 flex items-center justify-between gap-2 px-2 text-xs text-white/55">{copy.uiLanguage}<select value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value)} className="language-select min-w-0 max-w-[126px] rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-white/75 outline-none">{INTERFACE_LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <p className="px-2 pt-4 text-[11px] text-white/25">{copy.footer}</p>
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [classroomMode, setClassroomMode] = useState(false);
  const [studentName, setStudentName] = useState("Self");
  const [preferredLanguage, setPreferredLanguage] = useState("auto");
  const [uiLanguage, setUiLanguage] = useState(() => localStorage.getItem("lastmile-ui-language") || "english");
  const [solving, setSolving] = useState(false);
  const [simplifyingId, setSimplifyingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [authError, setAuthError] = useState(null);
  const copy = getUiCopy(uiLanguage);

  useEffect(() => {
    localStorage.setItem("lastmile-ui-language", uiLanguage);
  }, [uiLanguage]);

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

  const pending = useMemo(
    () => doubts.filter((d) => d.status === "pending" || d.status === "error"),
    [doubts]
  );
  const solved = useMemo(
    () => doubts.filter((d) => d.status === "solved").reverse(),
    [doubts]
  );

  async function handleAddText(text, language, solveNow = false) {
    const id = await addTextDoubt(deviceId, text, classroomMode ? studentName : "Self", language);
    if (solveNow) {
      await solveOneNow({ id, type: "text", content: text, preferredLanguage: language });
    }
  }

  async function handleAddImage(base64, mimeType, language, note = "", solveNow = false) {
    const id = await addImageDoubt(deviceId, base64, mimeType, classroomMode ? studentName : "Self", language, note);
    if (solveNow) {
      await solveOneNow({ id, type: "image", content: base64, mimeType, note, preferredLanguage: language });
    }
  }

  /** Shared single-doubt solve, used by both "Solve Now" (new doubt) and Retry (existing doubt). */
  async function solveOneNow(doubtLike) {
    setRetryingId(doubtLike.id);
    try {
      const results = await solveDoubts([doubtLike]);
      const r = results[0];
      if (r && r.status === "solved") {
        await markSolved(deviceId, r.id, r.answer, r.subject);
      } else {
        await markError(deviceId, doubtLike.id, (r && r.error) || "Couldn't solve this one.");
      }
    } catch (err) {
      console.error("Instant solve failed:", err);
      await markError(deviceId, doubtLike.id, "Couldn't reach the solving server. Try again.");
    } finally {
      setRetryingId(null);
    }
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
      await updateSimplifiedAnswer(deviceId, doubt.id, simplified, doubt.answer);
    } catch (err) {
      console.error("Simplify failed:", err);
      alert("Couldn't simplify this answer right now.");
    } finally {
      setSimplifyingId(null);
    }
  }

  /** Retries a single failed doubt without needing to re-solve the whole batch. */
  async function handleRetry(doubt) {
    await solveOneNow(doubt);
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
      <div className={`loading-screen ${theme === "light" ? "loading-light" : "loading-dark"}`}>
        <div className="loading-orbit" aria-hidden="true"><span /></div>
        <LastMileBadge />
        <div className="mt-5 text-center">
          <p className="loading-wordmark">LastMile</p>
          <p className="loading-status">{uiLanguage === "hindi" ? "आपके लिए जगह तैयार हो रही है..." : "Preparing your learning space..."}</p>
        </div>
        <div className="loading-progress" aria-hidden="true"><span /></div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-dvh overflow-x-hidden bg-shell text-white transition-colors">
      <div className="flex min-h-dvh">
        <Sidebar doubts={doubts} pending={pending} classroomMode={classroomMode} setClassroomMode={setClassroomMode} theme={theme} setTheme={setTheme} uiLanguage={uiLanguage} setUiLanguage={setUiLanguage} copy={copy} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="min-h-dvh min-w-0 flex-1 md:ml-[276px]">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.08] bg-shell/80 px-4 py-3 backdrop-blur-xl md:hidden sm:px-5 sm:py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition"
                aria-label="Open menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <LastMileBadge /><span className="last-mile-wordmark font-semibold">LastMile</span>
            </div>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </header>
          <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-14 md:pt-24">
            <div className="mb-10 text-center sm:mb-12">
              <p className="brand-kicker mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint/80 sm:text-xs sm:tracking-[0.2em]">LastMile AI</p>
              <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-tight text-white sm:text-5xl">{copy.welcomeTitle}</h1>
              <p className="mx-auto mt-4 max-w-lg text-[13px] leading-6 text-white/45 sm:text-sm">{copy.welcomeSubtitle}</p>
              <StudyCompanion3D theme={theme} />
            </div>
            <DoubtCapture
              onAddText={handleAddText}
              onAddImage={handleAddImage}
              classroomMode={classroomMode}
              studentName={studentName}
              setStudentName={setStudentName}
              preferredLanguage={preferredLanguage}
              setPreferredLanguage={setPreferredLanguage}
              uiLanguage={uiLanguage}
              copy={copy}
            />

            {pending.length > 0 && (
              <button
                onClick={handleSolveSession}
                disabled={solving}
                className={`w-full bg-mint text-shell rounded-xl py-3.5 font-body font-semibold text-[14px] tracking-tight disabled:opacity-60 hover:bg-mint/90 active:scale-[0.99] transition ${
                  solving ? "" : "animate-pulseglow"
                }`}
              >
                {solving
                  ? `Solving ${pending.length} doubt${pending.length > 1 ? "s" : ""}...`
                  : `Solve My ${pending.length} Doubt${pending.length > 1 ? "s" : ""}`}
              </button>
            )}

            {pending.length > 0 && (
              <section className="mt-10 space-y-2.5">
                <h2 className="text-[11px] font-bold text-white/35 uppercase tracking-widest font-body px-1">
                  {copy.pending} &middot; {pending.length}
                </h2>
                <div className="space-y-2.5">
                  {pending.map((d) => (
                    <AnswerCard
                      key={d.id}
                      doubt={d}
                      onDelete={handleDelete}
                      onRetry={handleRetry}
                      retrying={retryingId === d.id}
                      copy={copy}
                    />
                  ))}
                </div>
              </section>
            )}

            {solved.length > 0 && (
              <section className="mt-10 space-y-2.5">
                <h2 className="text-[11px] font-bold text-white/35 uppercase tracking-widest font-body px-1">
                  {copy.answered} &middot; {solved.length}
                </h2>
                <div className="space-y-2.5">
                  {solved.map((d) => (
                    <AnswerCard
                      key={d.id}
                      doubt={d}
                      onSimplify={handleSimplify}
                      onDelete={handleDelete}
                      simplifying={simplifyingId === d.id}
                      copy={copy}
                    />
                  ))}
                </div>
              </section>
            )}

            {doubts.length === 0 && <p className="pt-10 text-center text-sm text-white/25 font-body">{copy.noHistory}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}