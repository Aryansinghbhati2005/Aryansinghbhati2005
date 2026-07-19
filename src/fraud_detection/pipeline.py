"""Train a fraud classifier and anomaly detector for transaction monitoring."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import average_precision_score, classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from fraud_detection.data import save_synthetic_dataset

TARGET = "is_fraud"
FEATURES = [
    "amount",
    "hour",
    "days_since_signup",
    "distance_from_home",
    "merchant_risk_score",
    "failed_attempts_24h",
    "transactions_1h",
    "device_age_days",
    "foreign_transaction",
    "card_present",
]


def load_or_create_dataset(path: str | Path) -> pd.DataFrame:
    """Load transactions from CSV, creating demo data when the file is absent."""
    csv_path = Path(path)
    if not csv_path.exists():
        save_synthetic_dataset(csv_path)
    return pd.read_csv(csv_path)


def build_classifier() -> Pipeline:
    """Return a class-weighted supervised fraud model."""
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=220,
                    min_samples_leaf=4,
                    class_weight="balanced_subsample",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def build_anomaly_detector(contamination: float) -> Pipeline:
    """Return an unsupervised anomaly model for first-line triage."""
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", IsolationForest(n_estimators=250, contamination=contamination, random_state=42, n_jobs=-1)),
        ]
    )


def train(data_path: str | Path = "data/transactions.csv", model_dir: str | Path = "models") -> dict:
    """Train both models, save artifacts, and return evaluation metrics."""
    df = load_or_create_dataset(data_path)
    missing = set(FEATURES + [TARGET]) - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

    x = df[FEATURES]
    y = df[TARGET]
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.25, stratify=y, random_state=42)

    classifier = build_classifier()
    classifier.fit(x_train, y_train)
    fraud_scores = classifier.predict_proba(x_test)[:, 1]
    fraud_predictions = (fraud_scores >= 0.5).astype(int)

    contamination = max(float(y_train.mean()), 0.005)
    anomaly_detector = build_anomaly_detector(contamination=contamination)
    anomaly_detector.fit(x_train)
    anomaly_predictions = (anomaly_detector.predict(x_test) == -1).astype(int)

    metrics = {
        "rows": int(len(df)),
        "fraud_rate": round(float(y.mean()), 4),
        "roc_auc": round(float(roc_auc_score(y_test, fraud_scores)), 4),
        "average_precision": round(float(average_precision_score(y_test, fraud_scores)), 4),
        "classification_report": classification_report(y_test, fraud_predictions, output_dict=True, zero_division=0),
        "classifier_confusion_matrix": confusion_matrix(y_test, fraud_predictions).tolist(),
        "anomaly_confusion_matrix": confusion_matrix(y_test, anomaly_predictions).tolist(),
        "top_risk_features": _feature_importance(classifier),
    }

    output_dir = Path(model_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(classifier, output_dir / "fraud_classifier.joblib")
    joblib.dump(anomaly_detector, output_dir / "anomaly_detector.joblib")
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


def _feature_importance(classifier: Pipeline) -> list[dict[str, float | str]]:
    model = classifier.named_steps["model"]
    importances = sorted(zip(FEATURES, model.feature_importances_), key=lambda item: item[1], reverse=True)
    return [{"feature": feature, "importance": round(float(score), 4)} for feature, score in importances[:6]]


def score_transactions(input_csv: str | Path, output_csv: str | Path, model_dir: str | Path = "models") -> Path:
    """Score new transactions with both fraud probability and anomaly labels."""
    model_path = Path(model_dir) / "fraud_classifier.joblib"
    anomaly_path = Path(model_dir) / "anomaly_detector.joblib"
    classifier = joblib.load(model_path)
    anomaly_detector = joblib.load(anomaly_path)

    df = pd.read_csv(input_csv)
    df["fraud_probability"] = classifier.predict_proba(df[FEATURES])[:, 1]
    df["is_anomaly"] = (anomaly_detector.predict(df[FEATURES]) == -1).astype(int)
    df["review_priority"] = pd.cut(
        df["fraud_probability"], bins=[-0.01, 0.25, 0.6, 1.0], labels=["low", "medium", "high"]
    )

    destination = Path(output_csv)
    destination.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(destination, index=False)
    return destination


if __name__ == "__main__":
    result = train()
    print(json.dumps(result, indent=2))
