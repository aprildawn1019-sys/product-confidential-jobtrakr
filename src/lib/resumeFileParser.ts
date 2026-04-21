/**
 * Client-side resume file → plain text extractor.
 *
 * Used by:
 *  - Search Profile (Profile Editor) — feeds parsed text to the AI parser
 *    that auto-populates the structured profile.
 *  - Resumes page — imports the raw text into a new resume version that
 *    the user can then edit / mark primary.
 *
 * Supported formats:
 *  - PDF (via pdfjs-dist; worker loaded from CDN)
 *  - DOCX (via mammoth.extractRawText)
 *  - TXT / MD / unknown text → file.text()
 *
 * The libs are dynamically imported so we don't pay the bundle cost on
 * pages that never touch resume uploads.
 */

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/** Minimum length for "we actually got something useful out of the file." */
export const MIN_RESUME_TEXT_LENGTH = 20;

export class ResumeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeFileError";
  }
}

/**
 * Extract plain text from a user-supplied resume file. Throws a
 * `ResumeFileError` with a user-facing message on size / format / read
 * failures so callers can surface it directly in a toast.
 */
export async function extractTextFromResumeFile(file: File): Promise<string> {
  if (file.size > MAX_RESUME_FILE_BYTES) {
    throw new ResumeFileError("File is over 5MB. Please upload a smaller file.");
  }

  const name = file.name.toLowerCase();
  let text = "";

  if (file.type === "text/plain" || name.endsWith(".txt") || name.endsWith(".md")) {
    text = await file.text();
  } else if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: { str?: string }) => item.str ?? "").join(" "));
    }
    text = pages.join("\n\n");
  } else if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    text = result.value;
  } else {
    // Last-ditch: try as plain text. Legacy .doc binary will produce gibberish
    // but we let the length check below surface a clean error.
    text = await file.text();
  }

  if (text.trim().length < MIN_RESUME_TEXT_LENGTH) {
    throw new ResumeFileError(
      "Couldn't extract enough text from this file. Try a different format or paste the content manually.",
    );
  }

  return text;
}

/**
 * Convert plain text into the lightly-formatted HTML our `RichTextEditor`
 * expects: each blank-line-separated chunk becomes a `<p>`, and single
 * newlines become `<br>`. The Resumes page sanitizes the result with
 * DOMPurify before rendering.
 */
export function plainTextToResumeHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
    .filter((p) => p !== "<p></p>")
    .join("");
}
