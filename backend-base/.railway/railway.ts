import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const postgresData = volume("postgres-data", {
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
    allowOnlineResize: true,
    region: "us-west2",
    sizeMB: 1024,
  });

  const valkeyData = volume("valkey-data", {
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
    allowOnlineResize: true,
    region: "us-west2",
    sizeMB: 1024,
  });

  const seaweedfsData = volume("seaweedfs-data", {
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
    allowOnlineResize: true,
    region: "us-west2",
    sizeMB: 1024,
  });

  const valkey = service("valkey", {
    source: github("esauflores/templates", { checkSuites: false, rootDirectory: "backend-base/valkey" }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    replicas: { "us-west2": 1 },
    volumeMounts: { "/data": valkeyData },
  });

  const postgres = service("postgres", {
    source: github("esauflores/templates", { checkSuites: false, rootDirectory: "backend-base/postgres" }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    replicas: { "us-west2": 1 },
    volumeMounts: { "/var/lib/postgresql": postgresData },
    env: { POSTGRES_PASSWORD: preserve() },
  });

  const seaweedfs = service("seaweedfs", {
    source: github("esauflores/templates", { checkSuites: false, rootDirectory: "backend-base/seaweedfs" }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    replicas: { "us-west2": 1 },
    volumeMounts: { "/data": seaweedfsData },
  });

  return project("backend-base", {
    resources: [valkey, postgres, seaweedfs, postgresData, valkeyData, seaweedfsData],
  });
});
