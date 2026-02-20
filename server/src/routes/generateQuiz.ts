import { Router } from "express";
import { upload, formatMulterError } from "../services/fileUpload";
import { buildSourcePack, UploadedLocalFile } from "../services/textExtract";
import { cleanupLocalFiles } from "../services/tempCleanup";
import { generateQuizFromSource } from "../services/grokGenerate";
import { quizTypeSchema } from "../services/quizSchema";

const router = Router();

router.post("/generate-quiz", (req, res) => {
  upload.array("files", 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ ok: false, error: formatMulterError(err) });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(400).json({ ok: false, error: "At least one file is required." });
    }

    const questionCount = Number(req.body.questionCount);
    const quizTypeRaw = String(req.body.quizType || "");
    const difficultyRaw = req.body.difficulty ? String(req.body.difficulty) : undefined;

    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 100) {
      await cleanupLocalFiles(files.map((f) => f.path));
      return res.status(400).json({ ok: false, error: "questionCount must be an integer from 1-100." });
    }

    const quizTypeResult = quizTypeSchema.safeParse(quizTypeRaw);
    if (!quizTypeResult.success) {
      await cleanupLocalFiles(files.map((f) => f.path));
      return res.status(400).json({ ok: false, error: "Invalid quizType." });
    }

    if (difficultyRaw && !["easy", "medium", "hard"].includes(difficultyRaw)) {
      await cleanupLocalFiles(files.map((f) => f.path));
      return res.status(400).json({ ok: false, error: "difficulty must be easy|medium|hard." });
    }

    const localFiles: UploadedLocalFile[] = files.map((file) => ({
      path: file.path,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    try {
      const { sourcePack } = await buildSourcePack(localFiles);
      const result = await generateQuizFromSource({
        files: localFiles,
        sourcePack,
        quizType: quizTypeResult.data,
        questionCount,
        difficulty: difficultyRaw as "easy" | "medium" | "hard" | undefined
      });

      return res.status(result.ok ? 200 : 422).json(result);
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: `Failed to generate quiz: ${(error as Error).message}`
      });
    } finally {
      await cleanupLocalFiles(files.map((f) => f.path));
    }
  });
});

export default router;
