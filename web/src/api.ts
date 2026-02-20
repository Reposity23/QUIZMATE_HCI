export type QuizType = "mcq" | "fill_blank" | "identification" | "matching" | "mixed";
export type Difficulty = "easy" | "medium" | "hard" | "";

export async function generateQuiz(params: {
  files: File[];
  quizType: QuizType;
  questionCount: number;
  difficulty?: Difficulty;
}) {
  const form = new FormData();
  params.files.forEach((f) => form.append("files", f));
  form.append("quizType", params.quizType);
  form.append("questionCount", String(params.questionCount));
  if (params.difficulty) form.append("difficulty", params.difficulty);

  const resp = await fetch("/api/generate-quiz", {
    method: "POST",
    body: form
  });

  return resp.json();
}
