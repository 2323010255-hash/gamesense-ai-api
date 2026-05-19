# GameSense AI — API de Predicción de Engagement

API REST desarrollada con **FastAPI** y modelo de ML **CatBoost** para predecir el nivel de engagement de jugadores.

## Archivos del proyecto

| Archivo | Descripción |
|---------|-------------|
| `api.py` | Servidor FastAPI con endpoints REST |
| `prediccion_engine.py` | Motor de inferencia CatBoost |
| `modelo_catboost.cbm` | Modelo entrenado (binario) |
| `scaler.pkl` | Escalador de features (scikit-learn) |
| `static/index.html` | Interfaz web del predictor |
| `requirements.txt` | Dependencias de Python |
| `Procfile` | Comando de inicio para Render |

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Interfaz web del predictor |
| `GET` | `/health` | Estado del servicio |
| `POST` | `/predict` | Predicción de engagement |
| `GET` | `/docs` | Documentación Swagger |

## Ejecutar localmente

```bash
pip install -r requirements.txt
python api.py
```

Luego abre: http://localhost:8000

## Desplegar en Render.com

Ver la guía paso a paso en `DEPLOY_GUIDE.md`.
