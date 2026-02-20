import { z } from "zod";

export const mcqQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("mcq"),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(4),
  answer_index: z.number().int().nonnegative(),
  explanation: z.string().min(1)
}).refine((q) => q.answer_index < q.choices.length, {
  message: "answer_index must reference a valid choice",
  path: ["answer_index"]
});

export const fillBlankQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("fill_blank"),
  prompt: z.string().includes("____", { message: "fill_blank prompt must include ____" }),
  answers: z.array(z.string().min(1)).min(1),
  explanation: z.string().min(1)
});

export const identificationQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("identification"),
  prompt: z.string().min(1),
  answers: z.array(z.string().min(1)).min(1),
  explanation: z.string().min(1)
});

export const matchingQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("matching"),
  pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(4).max(10),
  explanation: z.string().min(1)
}).refine((q) => {
  const leftSet = new Set(q.pairs.map((p) => p.left));
  const rightSet = new Set(q.pairs.map((p) => p.right));
  return leftSet.size === q.pairs.length && rightSet.size === q.pairs.length;
}, { message: "matching pairs must have unique left/right values", path: ["pairs"] });

export const quizTypeSchema = z.enum(["mcq", "fill_blank", "identification", "matching", "mixed"]);
export type QuizType = z.infer<typeof quizTypeSchema>;

export const questionSchema = z.union([
  mcqQuestionSchema,
  fillBlankQuestionSchema,
  identificationQuestionSchema,
  matchingQuestionSchema
]);

export const quizSchema = z.object({
  quiz_title: z.string().min(1),
  quiz_type: quizTypeSchema,
  question_count: z.number().int().min(1).max(100),
  source_summary: z.string().min(1),
  questions: z.array(questionSchema).min(1).max(100)
}).superRefine((quiz, ctx) => {
  if (quiz.question_count !== quiz.questions.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["question_count"],
      message: "question_count must equal questions.length"
    });
  }

  if (quiz.quiz_type !== "mixed") {
    const mismatched = quiz.questions.find((q) => q.type !== quiz.quiz_type);
    if (mismatched) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions"],
        message: `All question.type values must be ${quiz.quiz_type} when quiz_type is not mixed`
      });
    }
  }
});

export type Quiz = z.infer<typeof quizSchema>;
