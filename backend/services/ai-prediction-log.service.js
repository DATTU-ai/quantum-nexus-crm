import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const predictionLogDir = path.join(__dirname, "..", "logs");
const predictionLogPath = path.join(predictionLogDir, "ai-predictions.jsonl");

const inferPredictedOutcome = (result) => {
  if ((result?.score ?? 0) >= 70) return "won";
  return "lost";
};

export async function logPrediction(leadId, result) {
  const entry = {
    timestamp: new Date().toISOString(),
    leadId,
    predictedScore: result?.score ?? null,
    predictedRisk: result?.riskLevel ?? result?.risk ?? null,
    predictedAction: result?.action ?? null,
    predictedOutcome: inferPredictedOutcome(result),
    actualOutcome: null,
    reason: result?.reason ?? null,
  };

  await fs.mkdir(predictionLogDir, { recursive: true });
  await fs.appendFile(predictionLogPath, `${JSON.stringify(entry)}\n`, "utf8");

  return entry;
}
