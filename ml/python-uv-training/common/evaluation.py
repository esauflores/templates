"""Accuracy diagnostics for hard label predictions."""

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class Evaluation:
    accuracy: float
    labels: tuple[str, ...]
    per_label_accuracy: dict[str, float | None]
    support: dict[str, int]
    confusion_matrix: tuple[tuple[int, ...], ...]  # rows=true, columns=predicted


def evaluate_predictions(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    *,
    labels: Sequence[str] | None = None,
) -> Evaluation:
    """Evaluate aligned hard labels; absent true classes have accuracy None."""
    truth, predictions = list(y_true), list(y_pred)
    if not truth or len(truth) != len(predictions):
        raise ValueError("Predictions and targets must have equal, nonzero length")
    if any(not isinstance(x, str) or not x for x in truth + predictions):
        raise ValueError("Targets and predictions must be nonempty label strings")

    # Explicit label order keeps confusion matrices comparable across runs.
    classes = (
        list(labels) if labels is not None else sorted(set(truth) | set(predictions))
    )
    if not classes or len(classes) != len(set(classes)):
        raise ValueError("labels must contain unique nonempty strings")
    if (set(truth) | set(predictions)) - set(classes):
        raise ValueError("Unknown target or predicted label")

    index = {label: i for i, label in enumerate(classes)}
    matrix = [[0] * len(classes) for _ in classes]
    for target, predicted in zip(truth, predictions):
        matrix[index[target]][index[predicted]] += 1

    support = {label: sum(matrix[i]) for i, label in enumerate(classes)}
    return Evaluation(
        sum(matrix[i][i] for i in range(len(classes))) / len(truth),
        tuple(classes),
        {
            label: matrix[i][i] / support[label] if support[label] else None
            for i, label in enumerate(classes)
        },
        support,
        tuple(tuple(row) for row in matrix),
    )
