import fs from "fs";
import path from "path";
import OpenAI from "openai";

type UploadedFileMeta = { id: string; filename?: string; size?: number };

let cachedKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  if (process.env.XAI_API_KEY) {
    cachedKey = process.env.XAI_API_KEY;
    return cachedKey;
  }

  const configPath = path.resolve(__dirname, "config.js");
  const tsConfigPath = path.resolve(process.cwd(), "src/config.ts");
  const jsExists = fs.existsSync(configPath);
  const tsExists = fs.existsSync(tsConfigPath);

  if (jsExists) {
    const local = await import(configPath);
    if (local.XAI_API_KEY) {
      cachedKey = local.XAI_API_KEY;
      return cachedKey;
    }
  }

  if (tsExists) {
    const local = await import(tsConfigPath);
    if (local.XAI_API_KEY) {
      cachedKey = local.XAI_API_KEY;
      return cachedKey;
    }
  }

  throw new Error("Missing XAI API key. Set XAI_API_KEY or create server/src/config.ts exporting XAI_API_KEY.");
}

export async function getXaiClient(): Promise<OpenAI> {
  return new OpenAI({
    apiKey: await getApiKey(),
    baseURL: "https://api.x.ai/v1"
  });
}

export async function uploadFileToXai(filePath: string, originalName: string): Promise<UploadedFileMeta> {
  const client = await getXaiClient();
  const file = await client.files.create({
    file: fs.createReadStream(filePath),
    purpose: "assistants"
  });

  return {
    id: file.id,
    filename: (file as any).filename ?? originalName,
    size: (file as any).bytes
  };
}

export async function deleteFileFromXai(fileId: string): Promise<void> {
  try {
    const client = await getXaiClient();
    await client.files.del(fileId);
  } catch {
    // best-effort cleanup only
  }
}

export async function createQuizResponse(params: {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: object;
  fileIds?: string[];
}): Promise<{ responseId: string; rawText: string }> {
  const client = await getXaiClient();

  const response = await client.responses.create({
    model: process.env.XAI_MODEL ?? "grok-4",
    input: [
      { role: "system", content: params.systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: params.userPrompt
          },
          ...(params.fileIds?.map((id) => ({ type: "input_file", file_id: id as string })) ?? [])
        ]
      }
    ],
    temperature: 0,
    store: false,
    ...(params.jsonSchema
      ? {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "quiz_schema",
              schema: params.jsonSchema,
              strict: true
            }
          }
        }
      : {})
  } as any);

  const rawText = (response as any).output_text ?? extractResponseText(response);
  return {
    responseId: response.id,
    rawText: rawText || ""
  };
}

function extractResponseText(response: any): string {
  if (!response?.output || !Array.isArray(response.output)) {
    return "";
  }

  const parts: string[] = [];
  for (const item of response.output) {
    if (!item?.content || !Array.isArray(item.content)) continue;
    for (const segment of item.content) {
      if (typeof segment?.text === "string") {
        parts.push(segment.text);
      } else if (typeof segment?.output_text === "string") {
        parts.push(segment.output_text);
      }
    }
  }

  return parts.join("\n").trim();
}
