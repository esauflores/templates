import { serve } from "@hono/node-server";
import { Hono } from "hono";
import * as ort from "onnxruntime-node";

const modelPath = process.env.MODEL_PATH ?? "../../models/mnist-8.onnx";
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: ["cpu"],
});
const inputName = session.inputNames[0];
const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok", model_loaded: true }));

app.post("/infer", async (c) => {
  const { inputs } = await c.req.json();
  const scores = [];
  for (const image of inputs) {
    const tensor = new ort.Tensor("float32", Float32Array.from(image), [1, 1, 28, 28]);
    const output = (await session.run({ [inputName]: tensor }))[session.outputNames[0]];
    scores.push(Array.from(output.data));
  }
  return c.json({ scores });
});

serve({ fetch: app.fetch, port: 8000 });
