"""Small utilities shared by study scripts."""

import random
from enum import Enum

import numpy as np
import torch


class Device(str, Enum):
    auto = "auto"
    cpu = "cpu"
    cuda = "cuda"


def resolve_device(device: str = "auto") -> str:
    """Choose CUDA when available, otherwise CPU; validate explicit requests."""
    device = Device(device).value
    if device == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise ValueError("CUDA was requested but is not available")
    return device


def seed_everything(seed: int = 42) -> None:
    """Seed Python, NumPy and PyTorch (CPU and CUDA).

    Controls random generators, not full determinism: some GPU operations and
    hardware/library differences can still vary.
    """
    if not isinstance(seed, int) or isinstance(seed, bool) or not 0 <= seed < 2**32:
        raise ValueError("seed must be an integer between 0 and 2**32 - 1")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
