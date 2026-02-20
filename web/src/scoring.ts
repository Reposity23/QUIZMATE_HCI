const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

export function scoreQuiz(quiz: any, answers: Record<string, any>) {
  let earned = 0;
  let possible = 0;
  const perQuestion: any[] = [];

  for (const q of quiz.questions) {
    if (q.type === "matching") {
      const expected = q.pairs;
      const given = answers[q.id] || {};
      let qEarned = 0;
      const pairResult = expected.map((p: any, i: number) => {
        const ok = normalize(given[i] || "") === normalize(p.right);
        if (ok) qEarned += 1;
        return { left: p.left, expected: p.right, got: given[i] || "", correct: ok };
      });
      earned += qEarned;
      possible += expected.length;
      perQuestion.push({ id: q.id, type: q.type, earned: qEarned, possible: expected.length, correct: qEarned === expected.length, pairResult });
      continue;
    }

    possible += 1;
    let correct = false;
    if (q.type === "mcq") {
      correct = Number(answers[q.id]) === q.answer_index;
    } else {
      const user = normalize(String(answers[q.id] || ""));
      correct = q.answers.some((a: string) => normalize(a) === user);
    }
    if (correct) earned += 1;
    perQuestion.push({ id: q.id, type: q.type, earned: correct ? 1 : 0, possible: 1, correct });
  }

  return { earned, possible, percent: possible ? (earned / possible) * 100 : 0, perQuestion };
}
