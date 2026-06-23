# Autor: Paisig Fernandez Neyer
# Script de entrenamiento — actualizado desde gamespredicctioncatboost.py

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from catboost import CatBoostClassifier
import joblib
import os

# ── Dataset ──────────────────────────────────────────────────────────────────
CSV_URL = (
    "https://raw.githubusercontent.com/2323010255-hash/Dataset-GameSenseAI"
    "/refs/heads/main/online_gaming_behavior_insights.csv"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if __name__ == "__main__":
    print("[*] Cargando dataset desde GitHub...")
    df = pd.read_csv(CSV_URL, sep=",")
    print(f"   Filas: {len(df)} | Columnas: {list(df.columns)}")

    # ── Variables ─────────────────────────────────────────────────────────────
    y = df["EngagementLevel"]
    X = df.drop("EngagementLevel", axis=1)

    # Detectar automáticamente columnas categóricas
    categorical_features = X.select_dtypes(include=["object", "category"]).columns.tolist()
    if len(categorical_features) == 0:
        categorical_features = None

    print(f"\n[OK] Features usadas ({len(X.columns)}): {list(X.columns)}")
    print(f"   Features categóricas: {categorical_features}")
    print(f"   Clases: {sorted(y.unique())}")

    # ── Split 80/20 ───────────────────────────────────────────────────────────
    # CatBoost maneja variables categóricas y numéricas nativamente → sin StandardScaler
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=30
    )

    # ── Entrenamiento Modelo Optimizado (320 iteraciones, depth=6) ────────────
    print("\n[*] Entrenando CatBoostClassifier (320 iteraciones, depth=6)...")
    model = CatBoostClassifier(
        iterations=320,
        random_state=30,
        cat_features=categorical_features,
        depth=6,
        verbose=False,
    )
    model.fit(X_train, y_train)

    # ── Evaluación ────────────────────────────────────────────────────────────
    preds = model.predict(X_test).flatten()
    print("\n[*] Reporte de clasificación:")
    print(classification_report(y_test, preds))

    # ── Guardar artefactos ────────────────────────────────────────────────────
    model_path = os.path.join(BASE_DIR, "modelo_catboost.cbm")
    model.save_model(model_path)
    print(f"[OK] Modelo guardado en: {model_path}")

    # Guardar lista de features para validación en el engine
    feature_cols = list(X.columns)
    cat_features_final = categorical_features if categorical_features else []
    joblib.dump(
        {"feature_cols": feature_cols, "cat_features": cat_features_final},
        os.path.join(BASE_DIR, "model_metadata.pkl"),
    )
    print("[OK] Metadata guardada en: model_metadata.pkl")
    print("\n[LISTO] Ejecuta: python api.py")
