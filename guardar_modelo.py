import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from catboost import CatBoostClassifier
import joblib
import os

# -- Dataset publico en GitHub ------------------------------------------------
CSV_URL = "https://raw.githubusercontent.com/2323010255-hash/Dataset-GameSenseAI/refs/heads/main/online_gaming_behavior_insightsStrategyCatBoost.csv"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("[*] Cargando dataset desde GitHub...")
df = pd.read_csv(CSV_URL, sep=",")
print(f"   Filas: {len(df)} | Columnas: {list(df.columns)}")

y = df["EngagementLevel"]
X = df.drop("EngagementLevel", axis=1)

print(f"\n[OK] Features usadas ({len(X.columns)}): {list(X.columns)}")
print(f"   Clases: {sorted(y.unique())}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=30
)

scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

model = CatBoostClassifier(iterations=70, random_state=30, verbose=False)
model.fit(X_train_sc, y_train)

from sklearn.metrics import classification_report
preds = model.predict(X_test_sc)
print("\n[*] Reporte de clasificacion:")
print(classification_report(y_test, preds.flatten(),
                             target_names=["Low", "Medium", "High"]))

model_path  = os.path.join(BASE_DIR, "modelo_catboost.cbm")
scaler_path = os.path.join(BASE_DIR, "scaler.pkl")

model.save_model(model_path)
joblib.dump(scaler, scaler_path)
