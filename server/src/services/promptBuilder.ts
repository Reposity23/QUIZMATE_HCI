import { QuizType } from "./quizSchema";

export function buildGrokSystemPrompt(): string {
  return [
    "You are a strict quiz JSON generator.",
    "",
    "You must output ONLY valid JSON.",
    "Do NOT include markdown.",
    "Do NOT include explanations outside the JSON.",
    "Do NOT include code fences.",
    "Do NOT include commentary.",
    "",
    "You must use ONLY information found in the provided files or SOURCE PACK.",
    "If insufficient information exists, reduce the question_count and mention this in source_summary.",
    "",
    "All math must use LaTeX delimiters:",
    "Inline: \\( ... \\)",
    "Block: \\[ ... \\]",
    "",
    "Follow the exact schema provided.",
    "Do not add extra properties.",
    "Do not remove required properties.",
    "Do not rename fields.",
    "Keep explanations short and factual.",
    "Ensure MCQ answer_index is a number referencing choices array.",
    "Ensure matching pairs are unique.",
    "Ensure fill_blank prompts contain '____'.",
    "Return JSON only."
  ].join("\n");
}

export function buildGrokUserPrompt(params: {
  quizType: QuizType;
  questionCount: number;
  difficulty?: "easy" | "medium" | "hard";
  schemaString: string;
}): string {
  const { quizType, questionCount, difficulty, schemaString } = params;

  return [
    "Generate an exam-ready quiz using the source material.",
    `Requested quizType: ${quizType}`,
    `Requested questionCount: ${questionCount}`,
    `Requested difficulty: ${difficulty ?? "not specified"}`,
    "",
    "CRITICAL TYPE RULES:",
    `- The returned top-level field "quiz_type" must exactly equal "${quizType}".`,
    `- If quizType != "mixed", then ALL questions must have question.type == "${quizType}".`,
    "- If quizType == \"mixed\", allow mixture but keep it sensible.",
    "",
    "COUNT RULES:",
    "- question_count MUST equal questions.length.",
    "- If there is insufficient material to generate the requested count, reduce question_count and return fewer questions.",
    "- Mention any reduction in source_summary.",
    "",
    "NO HALLUCINATIONS:",
    "- Use ONLY source content from attached files or SOURCE PACK.",
    "- Do not invent facts.",
    "",
    "JSON-PARSING GUARANTEE:",
    "- Entire response must be JSON.parse()'able.",
    "- No trailing commas.",
    "- No comments.",
    "- No extra text before or after JSON.",
    "",
    "MCQ RULES:",
    "- Provide >= 4 choices.",
    "- Ensure answer_index is valid and points to the correct choice.",
    "- Provide plausible distractors.",
    "",
    "FILL BLANK RULES:",
    "- Prompt must include ____ where blank is.",
    "- answers[] contains accepted answers.",
    "",
    "IDENTIFICATION RULES:",
    "- answers[] contains accepted answers.",
    "",
    "MATCHING RULES:",
    "- Provide 4–10 pairs depending on requested questionCount.",
    "- Ensure no repeated left or right.",
    "- Keep pairs grounded in source.",
    "- Explanation short.",
    "",
    "MATH AND CODE RULES:",
    "- Wrap math in LaTeX delimiters.",
    "- For code in prompts, use triple backticks inside JSON string values.",
    "",
    "Schema (follow exactly):",
    schemaString
  ].join("\n");
}
