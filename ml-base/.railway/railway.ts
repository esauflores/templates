import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const inference = service("inference", {
    source: github("esauflores/templates", { checkSuites: false, rootDirectory: "ml-base/inference" }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    replicas: { "us-west2": 1 },
  });

  return project("ml-base", {
    resources: [inference],
  });
});
