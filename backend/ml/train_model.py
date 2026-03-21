import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data.json"
MODEL_PATH = BASE_DIR / "model.pkl"

# Load data
with DATA_PATH.open("r", encoding="utf-8") as f:
    data = json.load(f)

X = []
y = []

for d in data:
    X.append([
        d["daysIdle"],
        d["dealValue"],
        d["probability"],
        d["stage"],
    ])
    y.append(d["outcome"])

X = np.array(X)
y = np.array(y)

if len(set(y.tolist())) < 2:
    raise ValueError("Training data must contain both outcome classes: 0 and 1.")

# Train model
model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X, y)

# Save model
joblib.dump(model, MODEL_PATH)

print("✅ Model trained")
