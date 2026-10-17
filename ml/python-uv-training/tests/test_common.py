import csv
from pathlib import Path

import pytest

from common import evaluate_predictions, load_data, make_label_mapping, write_submission


def write_csv(path: Path, header: list[str], rows: list[list[str]]) -> None:
    with path.open("w", newline="") as handle:
        csv.writer(handle).writerows([header, *rows])


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    write_csv(tmp_path / "train.csv", ["id", "label"], [["a", "cat"], ["b", "dog"]])
    write_csv(tmp_path / "test.csv", ["id"], [["c"], ["d"]])
    for split, ids in [("train", "ab"), ("test", "cd")]:
        (tmp_path / "images" / split).mkdir(parents=True)
        for id_ in ids:
            (tmp_path / "images" / split / f"{id_}.jpg").touch()
    return tmp_path


def test_load_data_preserves_csv_order(data_dir: Path) -> None:
    train, test = load_data(data_dir)

    assert [(r.id, r.label) for r in train] == [("a", "cat"), ("b", "dog")]
    assert [r.id for r in test] == ["c", "d"]
    assert test[0].path == data_dir / "images" / "test" / "c.jpg"


def test_load_data_rejects_missing_image(data_dir: Path) -> None:
    (data_dir / "images" / "test" / "d.jpg").unlink()

    with pytest.raises(FileNotFoundError):
        load_data(data_dir)


def test_label_mapping_is_alphabetical() -> None:
    assert make_label_mapping(["dog", "cat", "dog"]) == {"cat": 0, "dog": 1}


def test_evaluation_counts_confusions() -> None:
    report = evaluate_predictions(["cat", "cat", "dog"], ["cat", "dog", "dog"])

    assert report.accuracy == pytest.approx(2 / 3)
    assert report.per_label_accuracy == {"cat": 0.5, "dog": 1.0}
    assert report.confusion_matrix == ((1, 1), (0, 1))


def test_submission_keeps_test_order_and_refuses_overwrite(data_dir: Path) -> None:
    output = data_dir / "out" / "submission.csv"
    args = (data_dir / "test.csv", output)

    write_submission({"d": "dog", "c": "cat"}, *args, allowed_labels=["cat", "dog"])

    assert output.read_text().splitlines() == ["id,label", "c,cat", "d,dog"]
    with pytest.raises(FileExistsError):
        write_submission({"c": "cat", "d": "dog"}, *args, allowed_labels=["cat", "dog"])


def test_submission_rejects_unknown_label(data_dir: Path) -> None:
    with pytest.raises(ValueError, match="unknown labels"):
        write_submission(
            {"c": "cat", "d": "bird"},
            data_dir / "test.csv",
            data_dir / "submission.csv",
            allowed_labels=["cat", "dog"],
        )
