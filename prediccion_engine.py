import os
import numpy as np
import pandas as pd
import joblib
from catboost import CatBoostClassifier

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(BASE_DIR, "modelo_catboost.cbm")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

LABELS = ["Low", "Medium", "High"]

FEATURE_COLS = [
    "PlayTimeHours",
    "SessionsPerWeek",
    "AvgSessionDurationMinutes",
    "PlayerLevel",
    "AchievementsUnlocked",
]
_model = CatBoostClassifier()
_model.load_model(MODEL_PATH)
_scaler = joblib.load(SCALER_PATH)

def predecir(
    play_time_hours: float,
    sessions_per_week: int,
    avg_session_duration_minutes: int,
    player_level: int,
    achievements_unlocked: int,
) -> dict:
    """
    Predice el nivel de engagement de un jugador.

    Retorna:
        {
            "label": "Low" | "Medium" | "High",
            "probabilities": {
                "Low":    float,   # porcentaje 0-100
                "Medium": float,
                "High":   float,
            }
        }
    """
    X_df = pd.DataFrame([{
        "PlayTimeHours":             play_time_hours,
        "SessionsPerWeek":           sessions_per_week,
        "AvgSessionDurationMinutes": avg_session_duration_minutes,
        "PlayerLevel":               player_level,
        "AchievementsUnlocked":      achievements_unlocked,
    }], columns=FEATURE_COLS)

    X_scaled = _scaler.transform(X_df)

    probs     = _model.predict_proba(X_scaled)[0]
    label_idx = int(np.argmax(probs))
    label     = LABELS[label_idx]

    return {
        "label": label,
        "probabilities": {
            lbl: round(float(p) * 100, 2)
            for lbl, p in zip(LABELS, probs)
        },
    }
