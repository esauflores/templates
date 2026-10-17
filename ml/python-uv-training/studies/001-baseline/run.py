"""Frozen ImageNet ResNet-18 features + logistic regression."""

import json
import sys
import warnings
from dataclasses import asdict
from pathlib import Path
from typing import Annotated

import numpy as np
import torch
import typer
from loguru import logger
from PIL import Image
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset
from torchvision.models import ResNet18_Weights, resnet18
from tqdm.auto import tqdm

# Allow direct execution from any working directory without installing a package.
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from common import (  # noqa: E402
    Device,
    evaluate_predictions,
    load_data,
    resolve_device,
    seed_everything,
    write_submission,
)


class Images(Dataset):
    """Open one RGB image at a time and apply checkpoint preprocessing."""

    def __init__(self, records, transform):
        self.records = records
        self.transform = transform

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        with Image.open(self.records[index].path) as image:
            return self.transform(image.convert("RGB"))


@torch.inference_mode()
def extract_features(records, transform, encoder, device, batch_size):
    # Sequential batches keep feature rows aligned with CSV records.
    loader = DataLoader(
        Images(records, transform), batch_size=batch_size, shuffle=False
    )
    features = []
    for images in tqdm(loader, desc="Extracting features"):
        features.append(encoder(images.to(device)).flatten(1).cpu().numpy())
    return np.concatenate(features)


def main(
    data_dir: Path = ROOT / "data",
    output_dir: Path = Path(__file__).resolve().parent,
    device: Device = Device.auto,
    batch_size: Annotated[int, typer.Option(min=1)] = 32,
    seed: int = 42,
):
    """Validate on a stratified holdout, refit on all labels, write predictions."""
    if any((output_dir / name).exists() for name in ("submission.csv", "metrics.json")):
        raise typer.BadParameter(
            "Results already exist; choose a new --output-dir",
            param_hint="--output-dir",
        )

    seed_everything(seed)
    device = resolve_device(device)
    train, test = load_data(data_dir)
    labels = [record.label for record in train]
    fit_idx, val_idx = train_test_split(
        np.arange(len(labels)), test_size=0.25, stratify=labels, random_state=seed
    )
    logger.info(
        "Device: {}; split: {} fit / {} validation", device, len(fit_idx), len(val_idx)
    )

    # Frozen pretrained encoder; replace the head to keep the 512-D features.
    weights = ResNet18_Weights.IMAGENET1K_V1
    encoder = resnet18(weights=weights)
    encoder.fc = torch.nn.Identity()
    encoder.requires_grad_(False).eval().to(device)
    transform = weights.transforms()

    features = extract_features(train, transform, encoder, device, batch_size)
    targets = np.asarray(labels)

    # Never silently accept nonconvergence.
    with warnings.catch_warnings():
        warnings.simplefilter("error", ConvergenceWarning)
        classifier = LogisticRegression(max_iter=2000, random_state=seed)
        classifier.fit(features[fit_idx], targets[fit_idx])
        report = evaluate_predictions(
            targets[val_idx],
            classifier.predict(features[val_idx]),
            labels=sorted(set(labels)),
        )
        logger.info("Validation accuracy: {:.4f}", report.accuracy)

        # Fresh classifier fitted on ALL labelled rows for the test predictions.
        final = LogisticRegression(max_iter=2000, random_state=seed)
        final.fit(features, targets)

    predictions = final.predict(
        extract_features(test, transform, encoder, device, batch_size)
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    submission = write_submission(
        dict(zip((record.id for record in test), predictions)),
        data_dir / "test.csv",
        output_dir / "submission.csv",
        allowed_labels=labels,
    )

    # Save enough context to reproduce the split and interpret the score.
    metrics = {
        "validation": asdict(report),
        "seed": seed,
        "weights": str(weights),
        "weights_source": weights.url,
        "preprocessing": repr(transform),
        "device": device,
        "classifier": f"LogisticRegression(max_iter=2000, random_state={seed})",
        "fit_ids": [train[i].id for i in fit_idx],
        "validation_ids": [train[i].id for i in val_idx],
        "final_training_rows": len(train),
        "test_rows": len(test),
        "versions": {"torch": torch.__version__, "numpy": np.__version__},
    }
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    logger.info("Saved submission: {}", submission)


if __name__ == "__main__":
    typer.run(main)
