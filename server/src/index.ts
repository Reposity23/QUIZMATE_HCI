import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import generateQuizRouter from "./routes/generateQuiz";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "quizforge-prototype" });
});

app.use("/api", generateQuizRouter);

const webDist = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`QuizForge server listening on http://localhost:${port}`);
});
