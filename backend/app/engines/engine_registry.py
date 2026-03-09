from __future__ import annotations

from typing import Callable, Dict

ENGINE_REGISTRY: Dict[str, Callable] = {}


def register_engine(name: str):
    """
    Decorator used by engines to self-register.

    Example:

    @register_engine("portfolio")
    def evaluate_portfolio_growth(...):
        ...
    """

    def decorator(func: Callable):

        if name in ENGINE_REGISTRY:
            raise ValueError(f"Engine '{name}' already registered")

        ENGINE_REGISTRY[name] = func

        return func

    return decorator


def get_engine(name: str) -> Callable:
    """
    Retrieve an engine by name.
    """

    if name not in ENGINE_REGISTRY:
        raise KeyError(f"Engine '{name}' not registered")

    return ENGINE_REGISTRY[name]


def list_engines():
    """
    Return list of registered engines.
    """

    return list(ENGINE_REGISTRY.keys())