import json
import sys
from pathlib import Path

import joblib

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.pkl"

model = joblib.load(MODEL_PATH)

input_data = json.loads(sys.argv[1])

features = [[
    input_data["daysIdle"],
    input_data["dealValue"],
    input_data["probability"],
    input_data["stage"],
]]

prediction = int(model.predict(features)[0])

probability = float(prediction)
if hasattr(model, "predict_proba"):
    probas = model.predict_proba(features)[0]
    classes = list(model.classes_)
    if 1 in classes:
        probability = float(probas[classes.index(1)])
    elif len(probas) > 0:
        probability = float(probas[0])

result = {
    "winPrediction": prediction,
    "confidence": probability,
}

print(json.dumps(result))
