import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!apiKey) {
  console.warn(
    "\u26A0\uFE0F  GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key."
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// The core prompt design for "register-matching": preserve the student's
// own phrasing/language style instead of translating into formal English.
const SYSTEM_INSTRUCTION = `You are LastMile, a friendly doubt-solving assistant for Indian students in Tier 3-5 towns, many studying in Hindi or regional-medium government schools.

RULES YOU MUST FOLLOW:
1. Read the student's doubt (it may be typed as Hinglish, mixed Hindi-English, or plain English; it may also be a photo of a handwritten problem).
2. If the doubt is an image, first identify the actual question/problem written in the image, then solve it.
3. Explain the answer step-by-step, but MATCH THE STUDENT'S OWN REGISTER:
   - If they wrote in Hinglish/casual mixed language, explain back in a similarly natural, conversational Hinglish tone — NOT stiff textbook-formal English, and not pure Hindi if they wrote Hinglish.
   - If they wrote in plain English, explain in clear, simple English.
   - Never sound like a formal textbook. Sound like a patient senior student or older sibling explaining it.
4. Keep explanations concise but complete — enough to actually understand the step, not a wall of text.
5. At the end, on a new line, output exactly one line in this format (used internally, not shown to the student as prose):
   SUBJECT: <one or two word subject tag, e.g. "Math", "Physics", "Chemistry", "Biology", "English", "General">

Respond with ONLY the explanation followed by the SUBJECT line. No preamble like "Sure, here's the answer".`;

const SIMPLIFY_INSTRUCTION = `You are LastMile, a friendly doubt-solving assistant. You previously gave an explanation to a student. They found it too hard and tapped "Simplify Further". Re-explain the SAME answer in a much simpler way, as if explaining to a younger student (around Class 6 level). Keep the same natural register/language style (Hinglish stays Hinglish, English stays English) but use shorter sentences, simpler words, and a very basic analogy if it helps. Respond with ONLY the simplified explanation, no preamble.`;

function getModel(systemInstruction) {
  if (!genAI) throw new Error("Gemini API key not configured on the server.");
  return genAI.getGenerativeModel({ model: modelName, systemInstruction });
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
  const model = getModel(SYSTEM_INSTRUCTION);

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
  const model = getModel(SIMPLIFY_INSTRUCTION);
  const prompt = `Original doubt: ${originalDoubtText}\n\nOriginal explanation: ${originalAnswer}\n\nNow simplify it further.`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
