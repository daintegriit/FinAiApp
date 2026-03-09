import pkgutil
import importlib
import inspect
import app.engines


def test_all_engines_import():
    """
    Ensure every engine module imports correctly.
    """

    for module in pkgutil.iter_modules(app.engines.__path__):
        imported = importlib.import_module(f"app.engines.{module.name}")
        assert imported is not None


def test_engine_functions_callable():
    """
    Ensure engine modules contain callable logic.
    """

    for module in pkgutil.iter_modules(app.engines.__path__):
        mod = importlib.import_module(f"app.engines.{module.name}")

        callables = [
            obj for name, obj in inspect.getmembers(mod)
            if callable(obj)
        ]

        assert len(callables) > 0