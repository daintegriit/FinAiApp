# backend/scripts/benchmark_engines.py

"""
Benchmark financial engines for performance.
"""

import time
import pkgutil
import importlib
import app.engines


def benchmark():
    results = {}

    for module in pkgutil.iter_modules(app.engines.__path__):
        name = module.name

        start = time.time()
        importlib.import_module(f"app.engines.{name}")
        end = time.time()

        results[name] = end - start

    print("\nEngine Import Benchmark")
    print("----------------------")

    for engine, duration in results.items():
        print(f"{engine}: {duration:.4f}s")


if __name__ == "__main__":
    benchmark()