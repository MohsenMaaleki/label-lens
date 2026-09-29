/**
 * Label Lens API proxy — Cloudflare Worker.
 * Keeps the Gemini key off the device. Images are never stored.
 *
 * POST /analyze  { image: base64, mimeType, language }      -> LensResult JSON
 * POST /ask      { result, question, history, language }    -> { answer }
 */

export interface Env {
  GEMINI_API_KEY: string;
  APP_TOKEN: string; // shared secret the app sends in x-app-token (light abuse protection)
  GEMINI_MODEL?: string;
  GEMINI_FALLBACK_MODEL?: string; // asked once when the main model is busy, slow or returns bad output
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
// Together below the app's 30 s request timeout.
const PRIMARY_TIMEOUT_MS = 15_000;
const FALLBACK_TIMEOUT_MS = 12_000;

const DOC_TYPES = [
  "tax_notice", "fine", "residence_permit", "government_letter", "medication",
  "utility_bill", "bank_letter", "school_letter", "medical_report", "contract",
  "food_label", "other",
];
const LEVELS = ["high", "medium", "low"];
// Anything but "none" makes /analyze answer 422 so the app can ask for a better photo.
const IMAGE_PROBLEMS = ["none", "not_a_document", "unreadable"];

const RESULT_SCHEMA = {
  type: "OBJECT",
  properties: {
    doc_type: { type: "STRING", enum: DOC_TYPES },
    title: { type: "STRING", description: "Short name of the document in the user's language" },
    issuer: { type: "STRING", description: "Who sent/produced it, in original form. Empty if unknown." },
    original_language: { type: "STRING" },
    summary: { type: "STRING", description: "2-3 plain sentences, user's language, no jargon" },
    key_facts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { label: { type: "STRING" }, value: { type: "STRING" } },
        required: ["label", "value"],
      },
    },
    deadlines: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          approximate: {
            type: "BOOLEAN",
            description: "True only when \"date\" was computed from a rule plus a printed base date, not copied from a printed exact date.",
          },
          what: { type: "STRING" },
          date: {
            type: "STRING",
            description: "ISO YYYY-MM-DD. Either the exact date printed for this deadline, or a rule's base date plus its stated period, both taken only from the document. Empty if there is no printed base date to compute from. Never today, never guessed.",
          },
        },
        propertyOrdering: ["approximate", "what", "date"],
        required: ["approximate", "what", "date"],
      },
    },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          step: { type: "STRING" },
          urgency: { type: "STRING", enum: LEVELS },
        },
        required: ["step", "urgency"],
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    glossary: {
      type: "ARRAY",
      description: "Up to 5 official terms from the document, explained",
      items: {
        type: "OBJECT",
        properties: { term: { type: "STRING" }, meaning: { type: "STRING" } },
        propertyOrdering: ["term", "meaning"],
        required: ["term", "meaning"],
      },
    },
    payment: {
      type: "OBJECT",
      description: "How to pay, if the document asks for a payment. Empty strings if there is nothing to pay.",
      properties: {
        method: { type: "STRING", description: "The method that the one code belongs to, as printed, e.g. pagoPA, F24, Bollettino postale, IBAN" },
        code: { type: "STRING", description: "ONE code to pay with, copied exactly as printed, with its spaces, and nothing else: no label, no second code" },
      },
      propertyOrdering: ["method", "code"],
      required: ["method", "code"],
    },
    confidence: { type: "STRING", enum: LEVELS },
    unclear_parts: { type: "ARRAY", items: { type: "STRING" } },
    image_problem: { type: "STRING", enum: IMAGE_PROBLEMS },
  },
  // Without this Gemini writes fields alphabetically, so it would invent deadlines before judging
  // whether the photo is readable at all. Judge the photo first, then explain it.
  propertyOrdering: [
    "image_problem", "unclear_parts", "confidence", "doc_type", "original_language", "title", "issuer",
    "summary", "key_facts", "deadlines", "actions", "payment", "warnings", "glossary",
  ],
  required: [
    "doc_type", "title", "issuer", "original_language", "summary", "key_facts",
    "deadlines", "actions", "warnings", "glossary", "payment", "confidence", "unclear_parts",
    "image_problem",
  ],
};

function analyzePrompt(language: string, today: string) {
  return `You help newcomers, immigrants and refugees understand official documents, letters, labels and forms.
Today is ${today}, given only so you can judge how soon something is (e.g. for "urgency"). It is not on the
document and must never be used to compute a deadline date — every deadline is anchored to a date that is
actually printed on the document, never to today. Read the photographed document carefully.

Rules:
- First decide "image_problem" by looking at the actual characters. "not_a_document" if the photo shows no letter, form, bill, label or medicine box. "unreadable" if you cannot clearly read its main text (names, dates, amounts, codes) because it is blurry, dark or cut off. Otherwise "none", and list small unclear parts in "unclear_parts".
- NEVER guess. Write only what you can actually read in this photo, never what documents like this usually say. NEVER invent amounts, dates, codes or names. If something is unreadable or cut off, list it in "unclear_parts" and lower "confidence".
- Write EVERY human-readable field in ${language}. Keep "issuer" and "glossary.term" in the original language.
- Plain language, short sentences, as if explaining to a smart friend who does not know the local bureaucracy.
- Copy amounts, codes (payment/pagoPA codes, IBAN, protocol and file numbers) and names EXACTLY as printed, character by character, with Western digits 0-9. Never convert digits into another script, even when writing in ${language}.
- "deadlines": three cases, decided per deadline.
  1. An exact date is printed for it: "date" is that date as ISO YYYY-MM-DD (convert from the printed format), "approximate" is false, "what" says what is due.
  2. A rule with a period counted from a date printed elsewhere on the document (e.g. "entro 30 giorni dalla notifica" and the notification date is printed elsewhere): "date" is that printed base date plus the stated period, as ISO YYYY-MM-DD, "approximate" is true, and "what" must name the rule and the printed base date it was computed from (e.g. "Appeal: 30 days from the notification date (29/09/2026)").
  3. A rule with a period but no base date printed anywhere on the document: leave "date" empty, "approximate" is false, and describe the rule in "what" (e.g. "within 60 days of notification").
- "actions": the concrete next steps in order, usually 2-5 (where to go, what to bring, how to pay — e.g. PagoPA, post office, CAF, patronato, Questura). Empty only if nothing needs to be done.
- When a deadline is a payment, "what" also says the amount to pay by then, exactly as printed.
- "payment": if the document asks for a payment, ONE code to pay with in "code", copied exactly and with nothing else (no label, no second code), and the method that this code belongs to in "method" (pagoPA, F24, bollettino postale, bank transfer). If a payment notice code (e.g. "codice avviso", pagoPA) and an IBAN are both printed, use the payment notice code and put the IBAN in "key_facts". Empty strings if there is nothing to pay.
- "warnings": penalties, consequences of ignoring it, scam red flags if it looks suspicious.
- For medication or medical documents: explain dosage exactly as printed and always add a warning to confirm with a pharmacist or doctor.`;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-app-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors, ...headers },
  });
}

async function generate(env: Env, model: string, body: unknown, timeoutMs: number) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data: any = await res.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  if (!text) throw new Error(`Empty model response (${data?.candidates?.[0]?.finishReason ?? "no candidate"})`);
  return text;
}

/**
 * Asks the main model. If it fails (busy 503/429, timeout, empty or unusable output),
 * asks the fallback model once. Free-tier Gemini models are often "experiencing high demand".
 */
async function callGemini<T>(env: Env, body: unknown, parse: (text: string) => T) {
  const models = [env.GEMINI_MODEL || "gemini-3-flash-preview", env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite"];
  let lastError: unknown;
  for (const [i, model] of models.entries()) {
    try {
      const text = await generate(env, model, body, i === 0 ? PRIMARY_TIMEOUT_MS : FALLBACK_TIMEOUT_MS);
      return { value: parse(text), model };
    } catch (e) {
      console.warn(`${model} failed: ${String(e)}`);
      lastError = e;
    }
  }
  throw lastError;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strings = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const objects = (v: unknown): any[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);
const level = (v: unknown) => (LEVELS.includes(v as string) ? (v as string) : "medium");

/** ISO YYYY-MM-DD; converts day-first dates (16/10/2026, 16.10.2026) and keeps anything else as printed. */
function isoDate(v: unknown) {
  const s = str(v);
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s;
}

const sortKey = (date: string) => (/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "9999");

// The model sometimes writes the euro sign as a wrong Unicode escape (• "•" or ‐ "‐" instead
// of €), so an amount shows as "• 29,40". A stray mark of that block right before an amount is
// repaired to "€" only when the same reply names euros elsewhere; otherwise the mark is removed, so a
// currency is never invented.
const STRAY_BEFORE_AMOUNT = /[‐‑‖‗†-‥‧‰-⁞]\s?(?=\d{1,3}(?:[.,\s]\d{3})*[.,]\d{2}(?!\d))/g;

function repairCurrency<T>(result: T): T {
  const text = JSON.stringify(result);
  if (!STRAY_BEFORE_AMOUNT.test(text)) return result;
  STRAY_BEFORE_AMOUNT.lastIndex = 0;
  return JSON.parse(text.replace(STRAY_BEFORE_AMOUNT, /€|EUR|euro/i.test(text) ? "€ " : ""));
}

/** Guarantees the shape the app renders, so a sloppy model reply can never crash it. */
function normalizeResult(r: any) {
  if (!r || typeof r !== "object" || !str(r.summary)) throw new Error("Model reply has no summary");
  return repairCurrency({
    doc_type: DOC_TYPES.includes(r.doc_type) ? r.doc_type : "other",
    title: str(r.title),
    issuer: str(r.issuer),
    original_language: str(r.original_language),
    summary: str(r.summary),
    key_facts: objects(r.key_facts).map((f) => ({ label: str(f.label), value: str(f.value) })).filter((f) => f.value),
    deadlines: objects(r.deadlines)
      .map((d) => {
        const date = isoDate(d.date);
        return { date, what: str(d.what), approximate: date ? !!d.approximate : false };
      })
      .filter((d) => d.what)
      // Soonest first; rules without a usable date come last, in the order the model gave them.
      .sort((a, b) => sortKey(a.date).localeCompare(sortKey(b.date))),
    actions: objects(r.actions).map((a) => ({ step: str(a.step), urgency: level(a.urgency) })).filter((a) => a.step),
    warnings: strings(r.warnings),
    glossary: objects(r.glossary)
      .map((g) => ({ term: str(g.term), meaning: str(g.meaning) }))
      .filter((g) => g.term && g.meaning)
      .slice(0, 5),
    payment: { method: str(r.payment?.method), code: str(r.payment?.code) },
    confidence: level(r.confidence),
    unclear_parts: strings(r.unclear_parts),
    image_problem: IMAGE_PROBLEMS.includes(r.image_problem) ? (r.image_problem as string) : "none",
  });
}

/** A parse failure here would otherwise throw a native SyntaxError that can quote a fragment of the body. */
async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function analyze(req: Request, env: Env) {
  const { image, mimeType = "image/jpeg", language = "English" } = (await readJson(req)) as any;
  if (typeof image !== "string" || !image) return json({ error: "image required" }, 400);
  if (image.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: "image too large" }, 413);

  const today = new Date().toISOString().slice(0, 10);
  const { value, model } = await callGemini(
    env,
    {
      systemInstruction: { parts: [{ text: analyzePrompt(String(language).slice(0, 40), today) }] },
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: image } },
            { text: "Explain this document." },
          ],
        },
      ],
      // Gemini 3: keep the default temperature (1.0); low thinking keeps scans fast and cheap.
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESULT_SCHEMA,
        thinkingConfig: { thinkingLevel: "low" },
      },
    },
    (text) => {
      // A parse failure here would otherwise throw a native SyntaxError that can quote a
      // fragment of the model's output (which may contain names, codes or amounts).
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Model returned invalid JSON");
      }
      return normalizeResult(parsed);
    },
  );
  const { image_problem, ...result } = value;
  if (image_problem !== "none") return json({ error: image_problem }, 422, { "x-lens-model": model });
  return json(result, 200, { "x-lens-model": model });
}

/** The app shows answers as plain text, so remove Markdown the model may still add. */
function plainText(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .trim();
}

async function ask(req: Request, env: Env) {
  const { result, question, history = [], language = "English" } = (await readJson(req)) as any;
  if (!result || typeof question !== "string" || !question.trim())
    return json({ error: "result and question required" }, 400);

  const turns = (history as { role: "user" | "model"; text: string }[])
    .slice(-10)
    .map((h) => ({ role: h.role, parts: [{ text: String(h.text).slice(0, 2000) }] }));

  const { value: answer, model } = await callGemini(
    env,
    {
      systemInstruction: {
        parts: [
          {
            text: `You answer follow-up questions about ONE document the user scanned. Reply in ${String(language).slice(0, 40)}, briefly (max ~120 words), practically, in plain text (no Markdown: no asterisks, backticks or headings).
Only use facts from the document analysis below plus well-known general procedures; say clearly when something must be confirmed with the office, a CAF/patronato, a lawyer, doctor or pharmacist. Never invent amounts or dates. Copy codes and amounts exactly as they appear in the analysis.

Document analysis:
${JSON.stringify(result).slice(0, 12000)}`,
          },
        ],
      },
      contents: [...turns, { role: "user", parts: [{ text: question.slice(0, 1000) }] }],
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    },
    plainText,
  );
  return json({ answer }, 200, { "x-lens-model": model });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "not found" }, 404);
    if (env.APP_TOKEN && req.headers.get("x-app-token") !== env.APP_TOKEN)
      return json({ error: "unauthorized" }, 401);

    const path = new URL(req.url).pathname;
    try {
      if (path === "/analyze") return await analyze(req, env);
      if (path === "/ask") return await ask(req, env);
      return json({ error: "not found" }, 404);
    } catch (e: any) {
      // Bounded and message-only: never the raw error object, which for an unexpected
      // exception could otherwise carry a fragment of request or model content.
      console.error(String(e?.message ?? e).slice(0, 300));
      return json({ error: "analysis_failed", detail: String(e?.message ?? e).slice(0, 300) }, 502);
    }
  },
};
