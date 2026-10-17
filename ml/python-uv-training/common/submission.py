"""Validate predictions against the test CSV before writing."""

import csv
import os
import tempfile
from collections.abc import Iterable, Mapping
from pathlib import Path

from .data import read_csv


def write_submission(
    predictions: Mapping[str, str],
    test_csv: str | Path,
    output_path: str | Path,
    *,
    allowed_labels: Iterable[str],
    overwrite: bool = False,
) -> Path:
    """Write id,label in test order from ID-keyed hard predictions.

    Refuses missing/extra IDs, unknown labels and accidental overwrites.
    """
    test = Path(test_csv).expanduser().resolve()
    output = Path(output_path).expanduser().resolve()

    # Validate every prediction before creating any output file.
    ids = [row["id"] for row in read_csv(test, ["id"])]
    if set(predictions) != set(ids):
        raise ValueError("Prediction IDs must exactly match test IDs")
    vocabulary = set(allowed_labels)
    if not vocabulary or any(predictions[id_] not in vocabulary for id_ in ids):
        raise ValueError("Predictions contain unknown labels")
    if output == test:
        raise ValueError("Cannot overwrite the test CSV")
    if output.exists() and not overwrite:
        raise FileExistsError(output)

    # Write beside the destination, then publish the completed CSV atomically.
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", newline="", encoding="utf-8", dir=output.parent, delete=False
        ) as handle:
            temporary = Path(handle.name)
            writer = csv.writer(handle)
            writer.writerow(["id", "label"])
            writer.writerows((id_, predictions[id_]) for id_ in ids)

        if overwrite:
            os.replace(temporary, output)
        else:
            os.link(temporary, output)  # atomic no-clobber publication
        return output
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
