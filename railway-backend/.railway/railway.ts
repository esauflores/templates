import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const postgresData = volume("postgres-data", { region: "us-west2", sizeMB: 1024 });
  const valkeyData = volume("valkey-data", { region: "us-west2", sizeMB: 1024 });
  const seaweedfsData = volume("seaweedfs-data", { region: "us-west2", sizeMB: 1024 });

  const postgres = service("postgres", {
    source: github("esauflores/templates", { rootDirectory: "railway-backend/postgres" }),
    replicas: { "us-west2": 1 },
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    volumeMounts: { "/var/lib/postgresql": postgresData },
    env: { POSTGRES_PASSWORD: preserve() },
  });

  const valkey = service("valkey", {
    source: github("esauflores/templates", { rootDirectory: "railway-backend/valkey" }),
    replicas: { "us-west2": 1 },
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    volumeMounts: { "/data": valkeyData },
  });

  const seaweedfs = service("seaweedfs", {
    source: github("esauflores/templates", { rootDirectory: "railway-backend/seaweedfs" }),
    replicas: { "us-west2": 1 },
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    volumeMounts: { "/data": seaweedfsData },
  });

  return project("backend-base", {
    resources: [postgres, valkey, seaweedfs, postgresData, valkeyData, seaweedfsData],
  });
});
