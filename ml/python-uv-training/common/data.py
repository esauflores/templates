"""Dataset loading and label mapping, without ML dependencies.

Expected layout (adapt to the competition's actual files):

    data/train.csv            id,label
    data/test.csv             id
    data/images/train/<id>.jpg
    data/images/test/<id>.jpg
"""

import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Record:
    id: str
    path: Path
    label: str | None = None


def read_csv(path: Path, columns: list[str]) -> list[dict[str, str]]:
    """Read a CSV with exactly these columns, nonempty values and unique IDs."""
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != columns:
            raise ValueError(
                f"{path}: expected columns {columns}, got {reader.fieldnames}"
            )
        rows = list(reader)

    if not rows or any(
        set(row) != set(columns) or any(not row[c] for c in columns) for row in rows
    ):
        raise ValueError(f"{path}: empty CSV or malformed rows")

    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{path}: duplicate IDs")
    return rows


def load_data(
    data_dir: str | Path, *, image_dir: str = "images", suffix: str = ".jpg"
) -> tuple[list[Record], list[Record]]:
    """Load train/test CSVs and check every file exists, preserving CSV order."""
    root = Path(data_dir).expanduser().resolve()
    train = read_csv(root / "train.csv", ["id", "label"])
    test = read_csv(root / "test.csv", ["id"])
    if {r["id"] for r in train} & {r["id"] for r in test}:
        raise ValueError("Train and test IDs overlap")

    result = []
    for split, rows in [("train", train), ("test", test)]:
        records = [
            Record(
                r["id"], root / image_dir / split / f"{r['id']}{suffix}", r.get("label")
            )
            for r in rows
        ]
        for record in records:
            if not record.path.is_file():
                raise FileNotFoundError(record.path)
        result.append(records)
    return result[0], result[1]


def make_label_mapping(labels: list[str]) -> dict[str, int]:
    """Deterministic alphabetical label indices, shared across folds."""
    if not labels or any(not isinstance(label, str) or not label for label in labels):
        raise ValueError("Labels must be nonempty strings")
    return {label: index for index, label in enumerate(sorted(set(labels)))}
