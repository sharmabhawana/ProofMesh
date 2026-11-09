"""
ProofMesh — Datasets Engine Package
Provides synthetic generation, dataset auditing, schema validation, and scale benchmarks.
"""

from datasets_engine.generator import SyntheticProvenanceGenerator
from datasets_engine.validator import DatasetValidator
from datasets_engine.benchmarks import run_benchmark_scale

__all__ = [
    "SyntheticProvenanceGenerator",
    "DatasetValidator",
    "run_benchmark_scale",
]

