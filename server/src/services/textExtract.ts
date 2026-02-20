import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

export type UploadedLocalFile = {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export async function buildSourcePack(files: UploadedLocalFile[]): Promise<{ sourcePack: string; preview: string }> {
  const sections: string[] = [];

  for (const file of files) {
    const extracted = await extractTextFromFile(file);
    sections.push(`### FILE: ${file.originalname} (${file.mimetype})\n${extracted || "[No extractable text found]"}`);
  }

  const sourcePack = sections.join("\n\n");
  return { sourcePack, preview: sourcePack.slice(0, 500) };
}

async function extractTextFromFile(file: UploadedLocalFile): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  try {
    if (ext === ".pdf" || mime.includes("pdf")) {
      const buf = await fs.readFile(file.path);
      const parsed = await pdfParse(buf);
      return clean(parsed.text);
    }

    if (ext === ".docx" || mime.includes("wordprocessingml")) {
      const result = await mammoth.extractRawText({ path: file.path });
      return clean(result.value);
    }

    if (ext === ".pptx" || mime.includes("presentationml")) {
      return await extractPptxText(file.path);
    }

    if ([".txt", ".csv", ".json", ".md", ".ts", ".js", ".py", ".java", ".c", ".cpp"].includes(ext) || mime.startsWith("text/")) {
      const text = await fs.readFile(file.path, "utf8");
      return clean(text);
    }

    if (mime.startsWith("image/")) {
      return "[Image uploaded. OCR is not enabled in this prototype.]";
    }

    const fallback = await fs.readFile(file.path, "utf8").catch(() => Buffer.from(""));
    return clean(fallback.toString("utf8"));
  } catch (error) {
    return `[Extraction error: ${(error as Error).message}]`;
  }
}

async function extractPptxText(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort();

  const pieces: string[] = [];
  for (const slide of slides) {
    const xml = await zip.file(slide)?.async("string");
    if (!xml) continue;
    const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map((m) => m[1]);
    if (matches.length) {
      pieces.push(matches.join(" "));
    }
  }

  return clean(pieces.join("\n"));
}

function clean(input: string): string {
  return input.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
