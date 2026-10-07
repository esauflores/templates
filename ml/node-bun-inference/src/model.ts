import * as ort from "onnxruntime-node";

const modelPath = process.env.MODEL_PATH;
if (!modelPath) {
  throw new Error("MODEL_PATH is required");
}

const session = await ort.InferenceSession.create(modelPath, { executionProviders: ["cpu"] });
const inputName = session.inputNames[0];
const outputName = session.outputNames[0];

export async function infer(batch: number[][]): Promise<number[][]> {
  const scores: number[][] = [];
  for (const image of batch) {
    const tensor = new ort.Tensor("float32", Float32Array.from(image), [1, 1, 28, 28]);
    const output = (await session.run({ [inputName]: tensor }))[outputName];
    scores.push(Array.from(output.data as Float32Array));
  }
  return scores;
}
