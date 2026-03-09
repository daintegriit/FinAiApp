"""
Registry for financial policy engines.
"""

from app.policy.tax_models.progressive_stub import calculate_tax


ENGINE_REGISTRY = {
    "tax_model": calculate_tax
}


def get_engine(name: str):
    return ENGINE_REGISTRY.get(name)