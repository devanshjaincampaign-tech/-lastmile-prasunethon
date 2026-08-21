import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";

if (!apiKey) {
  console.warn(
    "\u26A0\uFE0F  GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key."
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// FORMATTING RULES: the frontend renders answers as plain text (no LaTeX
// or Markdown renderer), so the model must avoid $, \frac, \sqrt, **bold**,
// etc. — otherwise those symbols show up literally instead of rendering.
const FORMATTING_RULES = `FORMATTING RULES (the app displays plain text only — no LaTeX, no Markdown renderer):
- NEVER use LaTeX syntax: no $, $$, \\frac, \\sqrt, \\pm, \\times, or any backslash commands. Write math in plain words/symbols instead: "x squared" or "x^2", "plus or minus", "square root of 25", "5 times 2".
- NEVER use Markdown syntax: no **bold**, no * or - bullet symbols, no # headings. Use plain numbered lines like "Step 1:" on their own line instead.
- Keep it SHORT: aim for under 120 words for a typical doubt. Solve the student's actual question directly — do NOT make up a separate example problem to explain the method first.`;

const BASE_SYSTEM_INSTRUCTION_HEAD = `You are LastMile, a friendly doubt-solving assistant for Indian students in Tier 3-5 towns. Your students study in many different mediums — some in Hindi or regional-medium government schools, many in English-medium schools. Do not assume every student prefers Hindi or Hinglish — many will write and expect answers in plain English, and that must be respected exactly as much as any other language.

RULES YOU MUST FOLLOW:
1. Read the student's doubt (it may be typed as Hinglish, mixed Hindi-English, plain English, or a regional language; it may also be a photo of a handwritten or printed problem).
2. If the doubt is an image, first read and identify the actual question/problem written or printed in the image — including detecting what language and script IT is written in — then solve it.
3. Explain the answer step-by-step, but MATCH THE STUDENT'S OWN REGISTER:
   - If they wrote in Hinglish/casual mixed language, explain back in a similarly natural, conversational Hinglish tone — NOT stiff textbook-formal English, and not pure Hindi if they wrote Hinglish.
   - If they wrote in plain English, explain in clear, simple English. Do NOT switch to Hindi or Hinglish just because that's common for this app's other users — English input gets an English answer, full stop.
   - If a photo shows text in a specific language/script (e.g. a Hindi textbook page, an English worksheet, a Tamil notebook), reply in that same language/script unless the student's own note or language preference says otherwise.
   - Never sound like a formal textbook. Sound like a patient senior student or older sibling explaining it.`;

const BASE_SYSTEM_INSTRUCTION_TAIL = `${"5"}. ${FORMATTING_RULES}
6. At the end, on a new line, output exactly one line in this format (used internally, not shown to the student as prose):
   SUBJECT: <one or two word subject tag, e.g. "Math", "Physics", "Chemistry", "Biology", "English", "General">

Respond with ONLY the explanation followed by the SUBJECT line. No preamble like "Sure, here's the answer".`;

function buildSystemInstruction(preferredLanguage = "auto") {
  const languageRule = preferredLanguage === "auto"
    ? `CRITICAL — LANGUAGE: Detect the student's actual language, script, and register from what they wrote (or what's written in their photo) and reply in that SAME language/script. Roman letters do not automatically mean English or Hinglish: understand Romanized Hindi, Bhojpuri, Maithili, and other regional languages when that's what's actually being used. But equally — plain English input means the reply is in plain English. Never default to Hindi/Hinglish as a fallback; only use it when the student's own input is actually in Hindi/Hinglish.`
    : `CRITICAL — LANGUAGE: The student has explicitly requested the reply in "${preferredLanguage}". Use that language for your explanation regardless of which language/script the doubt itself was written in. Match script conventions naturally for that language (native script unless the student's own text used Roman letters and the language is commonly Romanized).`;
  return `${BASE_SYSTEM_INSTRUCTION_HEAD}\n4. ${languageRule}\n${BASE_SYSTEM_INSTRUCTION_TAIL}`;
}

const SIMPLIFY_INSTRUCTION = `You are LastMile, a friendly doubt-solving assistant. You previously gave an explanation to a student. They found it too hard and tapped "Simplify Further". Re-explain the SAME answer in a much simpler way, as if explaining to a younger student (around Class 6 level). Keep the exact same language and script style: Romanized Bhojpuri, Maithili, or Hindi stays Romanized, native-script text stays in its script, Hinglish stays Hinglish, and English stays English. Do not silently convert a student's Romanized local language into formal Hindi or English. Use shorter sentences, simpler words, and a very basic analogy if it helps. ${FORMATTING_RULES} Respond with ONLY the simplified explanation, no preamble.`;

function getModel(systemInstruction, maxOutputTokens) {
  if (!genAI) throw new Error("Gemini API key not configured on the server.");
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      maxOutputTokens,
      temperature: 0.4,
      // Gemini 3.x models use thinkingLevel, not the legacy thinkingBudget —
      // sending thinkingBudget causes a 400 "invalid argument" error on 3.x
      // models. "low" keeps reasoning fast/cheap while still solving properly
      // (curriculum-level math/science doubts do need some real reasoning,
      // unlike pure classification tasks where "minimal" would fit better).
      thinkingConfig: { thinkingLevel: "low" },
    },
  });
}

function parseSubjectTag(rawText) {
  const match = rawText.match(/SUBJECT:\s*(.+)\s*$/i);
  const subject = match ? match[1].trim() : "General";
  const answer = match ? rawText.slice(0, match.index).trim() : rawText.trim();
  return { answer, subject };
}

/**
 * Solve a single doubt. `doubt` is either:
 *   { type: "text", content: "<the doubt text>" }
 *   { type: "image", content: "<base64 data>", mimeType: "image/jpeg", note? }
 */
export async function solveDoubt(doubt) {
  const model = getModel(buildSystemInstruction(doubt.preferredLanguage), 1024);

  let parts;
  if (doubt.type === "image") {
    const notePart = doubt.note && doubt.note.trim()
      ? `The student attached this specific note/question about the photo: "${doubt.note.trim()}". Focus your answer on exactly that — if the photo shows multiple questions or a page of notes, answer only what the note asks about, not everything visible in the image.`
      : "Identify the actual question/problem written or printed in the image and solve it.";
    parts = [
      { text: `Here is a photo the student added. First read what language and script the text IN THE IMAGE is actually written in — that determines your reply language unless a language preference overrides it. ${notePart}` },
      { inlineData: { data: doubt.content, mimeType: doubt.mimeType || "image/jpeg" } },
    ];
  } else {
    parts = [{ text: `Student's doubt: ${doubt.content}` }];
  }

  const result = await model.generateContent(parts);
  const rawText = result.response.text();
  return parseSubjectTag(rawText);
}

/**
 * Re-explain a previously solved doubt at a simpler reading level.
 */
export async function simplifyAnswer(originalDoubtText, originalAnswer) {
  const model = getModel(SIMPLIFY_INSTRUCTION, 700);
  const prompt = `Original doubt: ${originalDoubtText}\n\nOriginal explanation: ${originalAnswer}\n\nNow simplify it further.`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}