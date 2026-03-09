import pkgutil
import importlib
import app.engines


def test_all_engines_import():
    """
    Ensure every engine module can be imported.
    """

    for module in pkgutil.iter_modules(app.engines.__path__):
        importlib.import_module(f"app.engines.{module.name}")