"""Synthetic data utilities for credit card fraud experiments.

The generated dataset intentionally resembles common credit-card fraud fields
without containing private cardholder information. It can be replaced by a real
CSV later as long as the target column is named ``is_fraud``.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


def generate_synthetic_transactions(rows: int = 12000, fraud_rate: float = 0.018, seed: int = 42) -> pd.DataFrame:
    """Create a reproducible, imbalanced transaction dataset."""
    rng = np.random.default_rng(seed)
    hours = rng.integers(0, 24, rows)
    days_since_signup = rng.gamma(shape=6, scale=55, size=rows).clip(1, 1800)
    amount = rng.lognormal(mean=3.4, sigma=1.0, size=rows).clip(1, 5000)
    distance_from_home = rng.exponential(scale=18, size=rows).clip(0, 600)
    merchant_risk_score = rng.beta(2, 8, rows)
    failed_attempts_24h = rng.poisson(0.18, rows)
    transactions_1h = rng.poisson(1.2, rows)
    device_age_days = rng.gamma(shape=4, scale=70, size=rows).clip(0, 1500)
    foreign_transaction = rng.binomial(1, 0.08, rows)
    card_present = rng.binomial(1, 0.72, rows)

    risk_logit = (
        -5.2
        + 0.0012 * amount
        + 0.007 * distance_from_home
        + 3.1 * merchant_risk_score
        + 0.42 * failed_attempts_24h
        + 0.32 * transactions_1h
        + 0.9 * foreign_transaction
        - 0.75 * card_present
        + np.where((hours <= 5) | (hours >= 23), 0.55, 0)
        - 0.001 * device_age_days
        - 0.00035 * days_since_signup
    )
    probability = 1 / (1 + np.exp(-risk_logit))
    threshold = np.quantile(probability, 1 - fraud_rate)
    is_fraud = (probability >= threshold).astype(int)

    return pd.DataFrame(
        {
            "amount": amount.round(2),
            "hour": hours,
            "days_since_signup": days_since_signup.round(1),
            "distance_from_home": distance_from_home.round(2),
            "merchant_risk_score": merchant_risk_score.round(4),
            "failed_attempts_24h": failed_attempts_24h,
            "transactions_1h": transactions_1h,
            "device_age_days": device_age_days.round(1),
            "foreign_transaction": foreign_transaction,
            "card_present": card_present,
            "is_fraud": is_fraud,
        }
    )


def save_synthetic_dataset(path: str | Path = "data/transactions.csv", rows: int = 12000) -> Path:
    """Generate and persist the demo transaction dataset."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    generate_synthetic_transactions(rows=rows).to_csv(output_path, index=False)
    return output_path


if __name__ == "__main__":
    print(f"Saved dataset to {save_synthetic_dataset()}")
