# python-uv-training

Experiment template for supervised ML competitions (Kaggle-style): numbered
studies share validated data loading, evaluation and submission helpers, and
each study is a standalone script that records its own metrics. Structure taken
from `hs-icaic-selection/task-a-pets`.

```text
common/            data.py, evaluation.py, submission.py, utils.py
studies/
  001-baseline/    run.py + README.md (method, procedure, results);
                   optional analysis.ipynb (ipykernel included; pick the .venv kernel)
data/              competition files (git-ignored)
outputs/           scratch output (git-ignored)
tests/             tests for common/
```

## Workflow

1. Put the competition files in `data/` (`train.csv` `id,label`, `test.csv`
   `id`, `images/<split>/<id>.jpg`) and adapt `common/data.py` to the actual
   layout. Record the source, download date and rules in this README.
2. Install with one PyTorch build, then run the baseline:
   `uv sync --extra cpu` (or `--extra cu126`, see below) and
   `uv run python studies/001-baseline/run.py`.
3. Add each experiment as a new `studies/NNN-name/` (copy the previous one):
   change one thing, keep the same seed and split so holdout scores stay
   comparable, and fill the study's Results table.
4. Never overwrite results: rerun with a new `--output-dir`. Keep `run.py`,
   `uv.lock` and `metrics.json` together for every submitted result.

Holdout accuracy and leaderboard scores measure different rows; record both,
but never conflate them. `submission.csv` and images under `studies/` are
git-ignored; `metrics.json` is committed.

## Commands

```sh
mise run check      # ruff lint + format check
mise run check-fix
mise run test       # pytest for common/
```

## PyTorch builds

`torch` and `torchvision` come from the PyTorch indexes through two
mutually exclusive extras, both in `uv.lock`:

| Extra   | Use                 | Build                                      |
| ------- | ------------------- | ------------------------------------------ |
| `cpu`   | laptop, CI          | `+cpu`, about 1 GB venv                    |
| `cu126` | NVIDIA GPU (remote) | CUDA 12.6, any driver with CUDA 12 (≥ 525) |

Plain PyPI `torch` would install the latest CUDA build on Linux (about 5 GB,
and it needs a recent driver). For newer GPUs, add a `cu130` extra the same way
in `pyproject.toml`.

Run `uv sync --extra cu126` on the GPU machine too, instead of its
preinstalled PyTorch, so local and remote runs share `uv.lock`. Studies pick
CUDA when available (`--device cpu|cuda` to force); record the GPU in the
study README.
