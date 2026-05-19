from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import prediccion_engine as engine
import os

app = FastAPI(
    title="GameSense AI API",
    description="Servicio de predicción de engagement de jugadores — CatBoost",
    version="1.0.0"
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
    sessions_per_week: int = Field(..., ge=0, le=19, description="Sesiones por semana")
    avg_session_duration_minutes: int = Field(..., ge=10, le=179, description="Duración promedio de sesión (min)")
    player_level: int = Field(..., ge=1, le=99, description="Nivel del jugador")
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
    return {"status": "online", "model": "CatBoost", "version": "1.0.0"}


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
            sessions_per_week=data.sessions_per_week,
            avg_session_duration_minutes=data.avg_session_duration_minutes,
            player_level=data.player_level,
            achievements_unlocked=data.achievements_unlocked,
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
