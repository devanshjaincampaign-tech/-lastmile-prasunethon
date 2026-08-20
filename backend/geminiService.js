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

const BASE_SYSTEM_INSTRUCTION = `You are LastMile, a friendly doubt-solving assistant for Indian students in Tier 3-5 towns, many studying in Hindi or regional-medium government schools.

RULES YOU MUST FOLLOW:
1. Read the student's doubt (it may be typed as Hinglish, mixed Hindi-English, or plain English; it may also be a photo of a handwritten problem).
2. If the doubt is an image, first identify the actual question/problem written in the image, then solve it.
3. Explain the answer step-by-step, but MATCH THE STUDENT'S OWN REGISTER:
   - If they wrote in Hinglish/casual mixed language, explain back in a similarly natural, conversational Hinglish tone — NOT stiff textbook-formal English, and not pure Hindi if they wrote Hinglish.
   - If they wrote in plain English, explain in clear, simple English.
   - Never sound like a formal textbook. Sound like a patient senior student or older sibling explaining it.
4. Treat language and script as separate things:
  - Roman letters do NOT automatically mean English. Understand Romanized Hindi, Bhojpuri, Maithili, and other regional languages written with English letters.
  - If the student writes a regional language using Roman letters, reply in that same regional language using Roman letters, preserving a natural local register and accent where possible.
  - If the student writes in a native script, reply in that script unless an explicit language preference asks for another script.
  - Preserve common English academic terms when they make the explanation clearer; do not translate technical names inaccurately.
5. ${FORMATTING_RULES}
6. At the end, on a new line, output exactly one line in this format (used internally, not shown to the student as prose):
   SUBJECT: <one or two word subject tag, e.g. "Math", "Physics", "Chemistry", "Biology", "English", "General">

Respond with ONLY the explanation followed by the SUBJECT line. No preamble like "Sure, here's the answer".`;

function buildSystemInstruction(preferredLanguage = "auto") {
  const languageRule = preferredLanguage === "auto"
    ? "Detect the student's language, script, and register. Roman letters do not necessarily mean English: understand Romanized Hindi, Bhojpuri, Maithili, and other regional languages. Reply in the same language and script style, including the same Romanized local-language style when that is how the student wrote."
    : `Prefer ${preferredLanguage} for the explanation. Match the student's script: if the input was written using Roman letters, reply using Roman letters; if it was written in a native script, use that script. Preserve local phrasing and accent rather than converting it into formal Hindi or English.`;
  return `${BASE_SYSTEM_INSTRUCTION}\n6. ${languageRule}`;
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
        thinkingConfig: { thinkingLevel: "low" },    },
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
 *   { type: "image", content: "<base64 data>", mimeType: "image/jpeg" }
 */
export async function solveDoubt(doubt) {
  const model = getModel(buildSystemInstruction(doubt.preferredLanguage), 1024);

  let parts;
  if (doubt.type === "image") {
    parts = [
      { text: "Here is a photo of the student's handwritten doubt. Identify the question and solve it." },
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