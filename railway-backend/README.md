# railway-backend

Railway backend template: Postgres (+pgvector/PostGIS/pg_trgm), Valkey, SeaweedFS (S3).

## Use as a Railway template

Drag `docker-compose.yml` onto a Railway project canvas (or feed it to the Template Creator) —
services and volumes import as staged changes. The file is an import spec, not a runtime config.

| Service   | Image                    | Port | Volume                     | Flags                                 |
| --------- | ------------------------ | ---- | -------------------------- | ------------------------------------- |
| postgres  | `postgres:18`            | 5432 | `/var/lib/postgresql/data` | `POSTGRES_PASSWORD`                   |
| valkey    | `valkey/valkey:9-alpine` | 6379 | `/data`                    | `--appendonly yes`                    |
| seaweedfs | `chrislusf/seaweedfs`    | 8333 | `/data`                    | `server -s3 -dir=/data -s3.port=8333` |

- Extensions (`vector`, `postgis`, `pg_trgm`, `unaccent`) are created on first boot by `postgres/init-extensions.sql`.
- SeaweedFS serves S3 unauthenticated by default — set `-s3.auth` (or IAM) before exposing port 8333 publicly.
- Local parity: `docker compose up --build` runs the same images.
