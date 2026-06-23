import os
import numpy as np
import pandas as pd
import joblib
from catboost import CatBoostClassifier

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH     = os.path.join(BASE_DIR, "modelo_catboost.cbm")
METADATA_PATH  = os.path.join(BASE_DIR, "model_metadata.pkl")

# ── Cargar artefactos ─────────────────────────────────────────────────────────
_model = CatBoostClassifier()
_model.load_model(MODEL_PATH)

_metadata     = joblib.load(METADATA_PATH)
_feature_cols = _metadata["feature_cols"]

# Las clases reales en el orden que CatBoost las registró
_labels = list(_model.classes_)


def predecir(
    play_time_hours: float,
    in_game_purchases: int,
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
                "High":   float,   # porcentaje 0-100
                "Low":    float,
                "Medium": float,
            }
        }
    """
    X_df = pd.DataFrame([{
        "PlayTimeHours":             play_time_hours,
        "InGamePurchases":           in_game_purchases,
        "SessionsPerWeek":           sessions_per_week,
        "AvgSessionDurationMinutes": avg_session_duration_minutes,
        "PlayerLevel":               player_level,
        "AchievementsUnlocked":      achievements_unlocked,
    }], columns=_feature_cols)

    probs     = _model.predict_proba(X_df)[0]
    label_idx = int(np.argmax(probs))
    label     = _labels[label_idx]

    return {
        "label": label,
        "probabilities": {
            lbl: round(float(p) * 100, 2)
            for lbl, p in zip(_labels, probs)
        },
    }
