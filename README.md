# Credit Card Fraud Detection & Anomaly Pipeline

An end-to-end AIML project for detecting suspicious credit-card transactions with a supervised fraud classifier and an unsupervised anomaly detection layer. The repository includes a reproducible synthetic dataset generator, model-training pipeline, batch scoring utility, and a lightweight Node.js dashboard that explains the workflow.

## Project Highlights

- **Synthetic transaction generator** for privacy-safe experimentation.
- **Supervised fraud model** using a class-weighted Random Forest to handle severe class imbalance.
- **Anomaly pipeline** using Isolation Forest to flag unusual spending patterns even when labels are unavailable.
- **Saved model artifacts** for repeatable scoring and deployment handoff.
- **Static dashboard** served by Node.js with pipeline stages, metrics, and risk feature explanations.

## Repository Structure

```text
.
├── data/                         # Generated CSV data lives here (gitignored except docs)
├── models/                       # Trained model artifacts live here (gitignored except docs)
├── public/                       # Dashboard frontend
├── src/fraud_detection/          # Python package for data generation, training, and scoring
├── requirements.txt              # Python dependencies
├── server.js                     # Node.js dashboard/API server
└── README.md
```

## Quick Start

### 1. Install Python dependencies

```bash
python -m pip install -r requirements.txt
```

### 2. Generate synthetic transaction data

```bash
python -m src.fraud_detection.data
```

### 3. Train the fraud + anomaly pipeline

```bash
PYTHONPATH=src python -m fraud_detection.pipeline
```

This creates:

- `data/transactions.csv`
- `models/fraud_classifier.joblib`
- `models/anomaly_detector.joblib`
- `models/metrics.json`

### 4. Run the dashboard

```bash
node server.js
```

Open `http://localhost:3000` in your browser.

## Using a Real Dataset

Replace `data/transactions.csv` with a CSV containing these columns:

| Column | Description |
| --- | --- |
| `amount` | Transaction value |
| `hour` | Hour of day from 0-23 |
| `days_since_signup` | Customer account age |
| `distance_from_home` | Distance between purchase location and usual area |
| `merchant_risk_score` | Merchant-level risk feature from 0-1 |
| `failed_attempts_24h` | Failed payment/auth attempts in the last day |
| `transactions_1h` | Velocity feature for the last hour |
| `device_age_days` | Age of device fingerprint |
| `foreign_transaction` | 1 if cross-border, otherwise 0 |
| `card_present` | 1 for card-present transactions, otherwise 0 |
| `is_fraud` | Label: 1 fraud, 0 legitimate |

## Batch Scoring Example

```python
from fraud_detection.pipeline import score_transactions

score_transactions(
    input_csv="data/new_transactions.csv",
    output_csv="data/scored_transactions.csv",
    model_dir="models",
)
```

The output file includes `fraud_probability`, `is_anomaly`, and `review_priority` columns for analyst triage.

## Responsible AI Notes

- Fraud predictions should support analyst review, not automatically deny customers without safeguards.
- Monitor precision, recall, false-positive rates, and drift across customer segments.
- Keep raw cardholder data tokenized or excluded from feature stores whenever possible.
- Retrain regularly because fraud tactics and merchant patterns change quickly.
