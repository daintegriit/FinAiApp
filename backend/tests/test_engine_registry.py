import pytest

from app.engines.engine_registry import ENGINE_REGISTRY


def test_registry_not_empty():
    """
    The engine registry must contain at least one engine.
    Prevents silent registry failures.
    """
    assert len(ENGINE_REGISTRY) > 0


def test_required_engines_present():
    """
    Ensure the critical financial engines are registered.
    """

    required_engines = {
        "policy",
        "portfolio",
        "commitment_lock",
        "scenarios",
    }

    registered = set(ENGINE_REGISTRY.keys())

    missing = required_engines - registered

    assert not missing, f"Missing engines: {missing}"


def test_engine_functions_callable():
    """
    Every registry entry must be callable.
    """

    for name, engine in ENGINE_REGISTRY.items():

        assert callable(engine), f"Engine {name} is not callable"


def test_no_duplicate_engine_names():
    """
    Guard against accidental duplicate registration.
    """

    names = list(ENGINE_REGISTRY.keys())

    assert len(names) == len(set(names)), "Duplicate engine names detected"