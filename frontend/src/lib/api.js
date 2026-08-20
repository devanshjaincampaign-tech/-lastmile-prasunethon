const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Sends a batch of pending doubts to the backend to be solved.
 * `doubts` should be [{ id, type, content, mimeType? }].
 * Returns [{ id, status, answer?, subject?, error? }].
 */
export async function solveDoubts(doubts) {
  const payload = doubts.map((d) => ({
    id: d.id,
    type: d.type,
    content: d.content,
    mimeType: d.mimeType,
    preferredLanguage: d.preferredLanguage || "auto",
  }));

  const res = await fetch(`${API_BASE}/api/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doubts: payload }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Solve request failed (${res.status})`);
  }

  const data = await res.json();
  return data.results;
}

/** Requests a simplified re-explanation of an already-solved doubt. */
export async function simplifyDoubt(doubtText, answer) {
  const res = await fetch(`${API_BASE}/api/simplify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doubtText, answer }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Simplify request failed (${res.status})`);
  }

  const data = await res.json();
  return data.simplified;
}
