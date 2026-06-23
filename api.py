from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import prediccion_engine as engine
import os
import io
import pandas as pd

app = FastAPI(
    title="GameSense AI API",
    description="Servicio de predicción de engagement de jugadores — CatBoost v2",
    version="2.0.0"
)

# Permitir peticiones desde el formulario web (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estáticos (el formulario HTML)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ── Esquema de entrada ──────────────────────────────────────────────────────
class PlayerData(BaseModel):
    play_time_hours: float = Field(..., ge=0, le=24, description="Horas de juego totales")
    in_game_purchases: int = Field(..., ge=0, le=1, description="Realiza compras en el juego (0=No, 1=Sí)")
    sessions_per_week: int = Field(..., ge=0, le=19, description="Sesiones por semana")
    avg_session_duration_minutes: int = Field(..., ge=10, le=179, description="Duración promedio de sesión (min)")
    player_level: int = Field(..., ge=1, le=100, description="Nivel del jugador")
    achievements_unlocked: int = Field(..., ge=0, le=49, description="Logros desbloqueados")


# ── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def serve_form():
    """Sirve el formulario web directamente."""
    html_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return {"status": "online", "message": "GameSense AI API running — coloca index.html en /static/"}


@app.get("/health")
def health():
    return {"status": "online", "model": "CatBoost", "version": "2.0.0"}


@app.post("/predict")
def predict(data: PlayerData):
    """
    Recibe los datos del jugador y devuelve la predicción de engagement.

    Respuesta:
    - `label`: "Low" | "Medium" | "High"
    - `probabilities`: dict con % para cada clase
    """
    try:
        resultado = engine.predecir(
            play_time_hours=data.play_time_hours,
            in_game_purchases=data.in_game_purchases,
            sessions_per_week=data.sessions_per_week,
            avg_session_duration_minutes=data.avg_session_duration_minutes,
            player_level=data.player_level,
            achievements_unlocked=data.achievements_unlocked,
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")


@app.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    """
    Recibe un CSV o XLSX con columnas:
    PlayTimeHours, InGamePurchases, SessionsPerWeek,
    AvgSessionDurationMinutes, PlayerLevel, AchievementsUnlocked.
    Devuelve distribución, porcentajes, promedios y muestra de 10 filas.
    """
    MAX_ROWS = 50_000
    REQUIRED = [
        "PlayTimeHours", "InGamePurchases", "SessionsPerWeek",
        "AvgSessionDurationMinutes", "PlayerLevel", "AchievementsUnlocked"
    ]

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    content = await file.read()

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(content))
        elif ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Usa CSV, XLSX o XLS.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error leyendo el archivo: {str(e)}")

    # Verificar columnas
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Columnas faltantes: {', '.join(missing)}"
        )

    # Limpiar filas inválidas
    original_len = len(df)
    df = df[REQUIRED].dropna().head(MAX_ROWS)
    discarded = original_len - len(df)

    # Corregir tipos
    df["PlayTimeHours"]              = pd.to_numeric(df["PlayTimeHours"], errors="coerce")
    df["InGamePurchases"]            = pd.to_numeric(df["InGamePurchases"], errors="coerce").fillna(0).astype(int).clip(0, 1)
    df["SessionsPerWeek"]            = pd.to_numeric(df["SessionsPerWeek"], errors="coerce").fillna(0).astype(int)
    df["AvgSessionDurationMinutes"]  = pd.to_numeric(df["AvgSessionDurationMinutes"], errors="coerce").fillna(10).astype(int)
    df["PlayerLevel"]                = pd.to_numeric(df["PlayerLevel"], errors="coerce").fillna(1).astype(int)
    df["AchievementsUnlocked"]       = pd.to_numeric(df["AchievementsUnlocked"], errors="coerce").fillna(0).astype(int)
    df = df.dropna()

    # Predecir fila a fila
    predictions = []
    for _, row in df.iterrows():
        try:
            result = engine.predecir(
                play_time_hours=float(row["PlayTimeHours"]),
                in_game_purchases=int(row["InGamePurchases"]),
                sessions_per_week=int(row["SessionsPerWeek"]),
                avg_session_duration_minutes=int(row["AvgSessionDurationMinutes"]),
                player_level=int(row["PlayerLevel"]),
                achievements_unlocked=int(row["AchievementsUnlocked"]),
            )
            predictions.append(result["label"])
        except Exception:
            predictions.append(None)

    df["Prediction"] = predictions
    df = df[df["Prediction"].notna()]
    total = len(df)

    if total == 0:
        raise HTTPException(status_code=422, detail="Ninguna fila pudo ser procesada correctamente.")

    # Distribución
    dist = df["Prediction"].value_counts().to_dict()
    distribution = {"Low": dist.get("Low", 0), "Medium": dist.get("Medium", 0), "High": dist.get("High", 0)}
    percentages  = {k: round(v / total * 100, 2) for k, v in distribution.items()}

    # Promedios
    numeric_cols = ["PlayTimeHours", "InGamePurchases", "SessionsPerWeek",
                    "AvgSessionDurationMinutes", "PlayerLevel", "AchievementsUnlocked"]
    averages = {col: round(float(df[col].mean()), 2) for col in numeric_cols}

    # Muestra (top 10)
    sample = df.head(10)[REQUIRED + ["Prediction"]].to_dict(orient="records")

    return {
        "total":        total,
        "discarded":    discarded,
        "distribution": distribution,
        "percentages":  percentages,
        "averages":     averages,
        "sample":       sample,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

