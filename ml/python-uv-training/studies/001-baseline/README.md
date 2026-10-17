# 001 — Frozen ResNet-18 baseline

```text
RGB image → ImageNet resize/center crop/normalization
          → frozen pretrained ResNet-18 → 512 features
          → logistic regression → label
```

## Procedure

1. Load all labelled rows and extract frozen features once, in CSV order.
2. One stratified holdout (`test_size=0.25`, seed 42); not cross-validation.
3. Fit logistic regression on the fit split; a convergence warning fails the
   run.
4. Record holdout accuracy, per-label accuracy and confusion matrix.
5. Refit a fresh classifier on **all** labelled rows and write validated test
   predictions. Nothing is submitted automatically.

## Run

```sh
uv run python studies/001-baseline/run.py
uv run python studies/001-baseline/run.py --device cpu --output-dir studies/001-baseline/run2
```

Writes `submission.csv` and `metrics.json` next to `run.py` (or to
`--output-dir`) and refuses to overwrite existing results.

## Results

| Run | Holdout accuracy | Leaderboard | Notes |
| --- | ---------------: | ----------: | ----- |
|     |                  |             |       |
