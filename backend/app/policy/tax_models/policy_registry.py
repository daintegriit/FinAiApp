"""
Policy Registry

Central registry for policy model versions used across
financial engines. This ensures reproducibility and
auditability of decision evaluations.

Every engine should reference policy assumptions
through this registry rather than hardcoding them.
"""

from __future__ import annotations

from datetime import datetime, UTC
from typing import Dict


REGISTRY_VERSION = "policy_registry_v2"


# --------------------------------------------------
# Policy Versions
# --------------------------------------------------

_POLICY_VERSIONS: Dict[str, str] = {

    "tax_model": "progressive_stub_v1",

    "assumptions": "global_assumptions_v1",

    "inflation_model": "inflation_baseline_v1",

    "market_return_model": "historical_return_baseline_v1",

}


# --------------------------------------------------
# Core Accessors
# --------------------------------------------------

def get_policy_versions() -> Dict[str, str]:
    """
    Returns a copy of all policy versions currently registered.
    Engines use this for reproducibility logging.
    """

    return dict(_POLICY_VERSIONS)


def get_policy_version(policy_name: str) -> str | None:
    """
    Returns the version string for a specific policy.
    """

    return _POLICY_VERSIONS.get(policy_name)


# --------------------------------------------------
# Metadata
# --------------------------------------------------

def get_registry_metadata() -> Dict[str, str]:
    """
    Returns metadata describing the policy registry state.
    """

    return {

        "registry_version": REGISTRY_VERSION,

        "policy_count": str(len(_POLICY_VERSIONS)),

        "generated_at": datetime.now(UTC).isoformat(),

    }