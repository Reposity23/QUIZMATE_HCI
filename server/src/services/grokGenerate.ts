import { createQuizResponse, deleteFileFromXai, uploadFileToXai } from "../xaiClient";
import { buildGrokSystemPrompt, buildGrokUserPrompt } from "./promptBuilder";
import { Quiz, quizSchema, QuizType } from "./quizSchema";
import { UploadedLocalFile } from "./textExtract";

const quizJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["quiz_title", "quiz_type", "question_count", "source_summary", "questions"],
  properties: {
    quiz_title: { type: "string" },
    quiz_type: { type: "string", enum: ["mcq", "fill_blank", "identification", "matching", "mixed"] },
    question_count: { type: "number" },
    source_summary: { type: "string" },
    questions: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["id", "type", "prompt", "choices", "answer_index", "explanation"],
            properties: {
              id: { type: "string" },
              type: { type: "string", const: "mcq" },
              prompt: { type: "string" },
              choices: { type: "array", items: { type: "string" } },
              answer_index: { type: "number" },
              explanation: { type: "string" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["id", "type", "prompt", "answers", "explanation"],
            properties: {
              id: { type: "string" },
              type: { type: "string", const: "fill_blank" },
              prompt: { type: "string" },
              answers: { type: "array", items: { type: "string" } },
              explanation: { type: "string" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["id", "type", "prompt", "answers", "explanation"],
            properties: {
              id: { type: "string" },
              type: { type: "string", const: "identification" },
              prompt: { type: "string" },
              answers: { type: "array", items: { type: "string" } },
              explanation: { type: "string" }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["id", "type", "pairs", "explanation"],
            properties: {
              id: { type: "string" },
              type: { type: "string", const: "matching" },
              pairs: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["left", "right"],
                  properties: {
                    left: { type: "string" },
                    right: { type: "string" }
                  }
                }
              },
              explanation: { type: "string" }
            }
          }
        ]
      }
    }
  }
};

export async function generateQuizFromSource(params: {
  files: UploadedLocalFile[];
  sourcePack: string;
  quizType: QuizType;
  questionCount: number;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<{
  ok: boolean;
  quiz?: Quiz;
  error?: string;
  raw?: string;
  details?: string;
  debug: {
    responseId?: string;
    fileIds: string[];
    sourcePackLength: number;
    sourcePackPreview: string;
  };
}> {
  const uploaded: string[] = [];
  const keepFiles = process.env.XAI_KEEP_FILES === "true";

  try {
    for (const file of params.files) {
      const remote = await uploadFileToXai(file.path, file.originalname);
      uploaded.push(remote.id);
    }

    const systemPrompt = buildGrokSystemPrompt();
    const schemaString = JSON.stringify(quizJsonSchema, null, 2);
    const userPrompt = buildGrokUserPrompt({
      quizType: params.quizType,
      questionCount: params.questionCount,
      difficulty: params.difficulty,
      schemaString
    });

    const finalUserText = `${userPrompt}\n\n=== SOURCE PACK (EXTRACTED TEXT) ===\n${params.sourcePack}`;

    const response = await createQuizResponse({
      systemPrompt,
      userPrompt: finalUserText,
      jsonSchema: quizJsonSchema,
      fileIds: uploaded
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.rawText);
    } catch {
      return {
        ok: false,
        error: "Invalid JSON or schema mismatch",
        raw: response.rawText,
        debug: {
          responseId: response.responseId,
          fileIds: uploaded,
          sourcePackLength: params.sourcePack.length,
          sourcePackPreview: params.sourcePack.slice(0, 500)
        }
      };
    }

    const validation = quizSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        ok: false,
        error: "Invalid JSON or schema mismatch",
        raw: response.rawText,
        details: JSON.stringify(validation.error.issues, null, 2),
        debug: {
          responseId: response.responseId,
          fileIds: uploaded,
          sourcePackLength: params.sourcePack.length,
          sourcePackPreview: params.sourcePack.slice(0, 500)
        }
      };
    }

    return {
      ok: true,
      quiz: validation.data,
      debug: {
        responseId: response.responseId,
        fileIds: uploaded,
        sourcePackLength: params.sourcePack.length,
        sourcePackPreview: params.sourcePack.slice(0, 500)
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message,
      debug: {
        fileIds: uploaded,
        sourcePackLength: params.sourcePack.length,
        sourcePackPreview: params.sourcePack.slice(0, 500)
      }
    };
  } finally {
    if (!keepFiles) {
      await Promise.all(uploaded.map((id) => deleteFileFromXai(id)));
    }
  }
}
