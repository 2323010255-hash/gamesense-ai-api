# Autor: Paisig Fernandez Neyer

# ==========================================
# PASO 1: IMPORTACIÓN DE LIBRERÍAS
# ==========================================
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
from catboost import CatBoostClassifier

# ==========================================
# PASO 2: CARGA Y LIMPIEZA DE DATOS
# ==========================================
# Cargar datos

ruta_archivo = "https://raw.githubusercontent.com/2323010255-hash/Dataset-GameSenseAI/refs/heads/main/online_gaming_behavior_insights.csv"
dataframe = pd.read_csv(ruta_archivo, sep=",")

# ==========================================
# PASO 3: EXPLORACIÓN INICIAL (EDA)
# ==========================================
print("--- Primeras 10 filas del Dataset ---")
print(dataframe.head(10))

print("\n--- Descripción Estadística (Promedios, Mínimos, Máximos) ---")
print(dataframe.describe())

print("\n--- Conteo por nivel de Engagement ---")
print(dataframe.groupby('EngagementLevel').size())

# Graficar la distribución original
sns.catplot(x='EngagementLevel', data=dataframe, kind="count", height=5, aspect=1.2)
plt.title('Distribución de Engagement Level')

# ==========================================
# PASO 4: PREPARACIÓN DE DATOS (X e Y)
# ==========================================
# Separamos el dataframe en variables predictoras (X) y la variable a predecir (Y)
y = dataframe['EngagementLevel']
x = dataframe.drop('EngagementLevel', axis=1)

# Identificar automáticamente las variables categóricas para CatBoost
categorical_features = x.select_dtypes(include=['object', 'category']).columns.tolist()
if len(categorical_features) == 0:
    categorical_features = None # Evita bugs de scikit-learn al clonar el modelo si no hay texto

# Separar en datos de entrenamiento (80%) y prueba (20%)
x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=30)
# (Nota: No usamos StandardScaler porque CatBoost procesa datos numéricos y categóricos nativamente sin escalar)

# ==========================================
# PASO 5: ENTRENAMIENTO DEL MODELO BASE (400 Árboles)
# ==========================================
print("\n[FASE 1] Entrenando CatBoost (Modelo Base - 400 iteraciones)")
modelo_cb_base = CatBoostClassifier(
    iterations=400, 
    random_state=30, 
    cat_features=categorical_features, 
    depth=6, 
    verbose=False
)
modelo_cb_base.fit(x_train, y_train)

# Predicciones y Evaluación del Modelo Base
predicciones_base = modelo_cb_base.predict(x_test)
predicciones_base_flat = predicciones_base.flatten()

print("\n--- Reporte de Clasificación (Modelo Base) ---")
print(classification_report(y_test, predicciones_base_flat))

# Matriz de Confusión del Modelo Base
plt.figure(figsize=(7, 5))
etiquetas_unicas = sorted(y_test.unique())
sns.heatmap(confusion_matrix(y_test, predicciones_base_flat, labels=etiquetas_unicas), 
            annot=True, fmt="d", cmap="Blues",
            xticklabels=etiquetas_unicas, yticklabels=etiquetas_unicas)
plt.title('Matriz de Confusión - Modelo Base (400 iteraciones)')
plt.xlabel('Predicción del Modelo')
plt.ylabel('Dato Real')

# ==========================================
# PASO 6: BÚSQUEDA DEL NÚMERO ÓPTIMO DE ÁRBOLES
# ==========================================
print("\n[FASE 2] Calculando evolución de la tasa de error para la gráfica (esto tomará unos segundos)...")
tasa_error_cb = []
valores_arboles = range(20, 400, 20) # Rango de árboles a evaluar

for i in valores_arboles:
    modelo_temp = CatBoostClassifier(iterations=i, random_state=30, cat_features=categorical_features, verbose=False)
    modelo_temp.fit(x_train, y_train)
    prediccion_i = modelo_temp.predict(x_test)
    tasa_error_cb.append(np.mean(prediccion_i.flatten() != y_test))

# Generar la gráfica visual del error
plt.figure(figsize=(10, 6))
plt.plot(valores_arboles, tasa_error_cb, color='purple', marker='o', markerfacecolor='orange', markersize='8')
plt.title('Evolución del Error vs. Cantidad de Árboles (CatBoost)')
plt.xlabel('Número de Árboles (iterations)')
plt.ylabel('Tasa de Error')
plt.grid(True)

# ==========================================
# PASO 7: ENTRENAMIENTO DEL MODELO FINAL OPTIMIZADO
# ==========================================
print("\n[FASE 3] Entrenando CatBoost (Modelo Optimizado - 260 iteraciones)")
modelo_cb = CatBoostClassifier(
    iterations=320, 
    random_state=30, 
    cat_features=categorical_features, 
    verbose=False
)
modelo_cb.fit(x_train, y_train)

# Predicciones y Evaluación del Modelo Optimizado
predicciones = modelo_cb.predict(x_test)
predicciones_flat = predicciones.flatten()

print("\n--- Reporte de Clasificación (Modelo Optimizado) ---")
print(classification_report(y_test, predicciones_flat))

# Matriz de Confusión del Modelo Optimizado
plt.figure(figsize=(7, 5))
sns.heatmap(confusion_matrix(y_test, predicciones_flat, labels=etiquetas_unicas), 
            annot=True, fmt="d", cmap="Blues",
            xticklabels=etiquetas_unicas, yticklabels=etiquetas_unicas)
plt.title('Matriz de Confusión - Modelo Optimizado (260 iteraciones)')
plt.xlabel('Predicción del Modelo')
plt.ylabel('Dato Real')

# ==========================================
# PASO 8: ANÁLISIS DE IMPORTANCIA DE VARIABLES
# ==========================================
importances = modelo_cb.get_feature_importance()
feature_names = x.columns

# Crear un diccionario para agrupar las importancias (por si hay variables derivadas)
grouped_importances = {}
for name, imp in zip(feature_names, importances):
    base_name = name.split('_')[0] if '_' in name else name
    grouped_importances[base_name] = grouped_importances.get(base_name, 0) + imp

# Convertir a Serie de Pandas, ordenar y graficar
grouped_series = pd.Series(grouped_importances).sort_values(ascending=True)

plt.figure(figsize=(10, 6))
grouped_series.plot(kind='barh', color='steelblue', width=0.7)
plt.title('Importancia de las Variables Principales (Modelo Optimizado)')
plt.xlabel('Importancia Relativa')
plt.ylabel('Variables Principales')
plt.grid(axis='x', linestyle='--', alpha=0.5)
plt.tight_layout()

# ==========================================
# PASO 9: VALIDACIÓN CRUZADA (ACADÉMICA)
# ==========================================
print("\n--- [FASE 4] Realizando Validación Cruzada (5 Folds) ---")
print("Esto tomará unos segundos, entrenando el modelo 5 veces...")

# StratifiedKFold asegura que en los 5 exámenes haya la misma proporción de High, Medium y Low
kfold_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=30)
resultados_cv = cross_val_score(modelo_cb, x, y, cv=kfold_cv, scoring='accuracy')

print(f"Resultados de los 5 exámenes (Accuracy): {resultados_cv}")
print(f"-> Precisión Promedio Oficial: {resultados_cv.mean() * 100:.2f}%")
print(f"-> Margen de error (Desviación): ±{resultados_cv.std() * 100:.2f}%")
print("==========================================")

# ==========================================
# PASO 10: SIMULACIÓN DE PREDICCIÓN DE NUEVOS DATOS
# ==========================================
print("\n--- [FASE 5] Predicción para un Nuevo Jugador (Simulación) ---")

# Datos basados en la primera fila provista para probar el algoritmo en vivo
datos_nuevo_jugador = pd.DataFrame([{
    'Age': 43,
    'Gender': 'Male',
    'Location': 'Other',
    'GameGenre': 'Strategy',
    'PlayTimeHours': 16.27111876,
    'InGamePurchases': 0,
    'GameDifficulty': 'Medium',
    'SessionsPerWeek': 6,
    'AvgSessionDurationMinutes': 108,
    'PlayerLevel': 79,
    'AchievementsUnlocked': 25
}])

print("Datos ingresados:")
print(datos_nuevo_jugador)

# Asegurar que los datos nuevos tengan las columnas correctas (rellena con 0 si faltan)
columnas_faltantes = set(x.columns) - set(datos_nuevo_jugador.columns)
for col in columnas_faltantes:
    datos_nuevo_jugador[col] = 0
datos_nuevo_jugador = datos_nuevo_jugador[x.columns]

# Predicción directa sin encoding manual
prediccion_nueva = modelo_cb.predict(datos_nuevo_jugador)

# Traducir el resultado a texto legible
resultado = prediccion_nueva[0]
resultado_texto = str(resultado[0]) if isinstance(resultado, np.ndarray) else str(resultado)

print("\n>>> RESULTADO DE LA PREDICCIÓN FINAL <<<")
print(f"El modelo CatBoost predice que este jugador tendrá un nivel de Engagement: {resultado_texto.upper()}")

# Mostrar todas las gráficas generadas durante el script
plt.show()