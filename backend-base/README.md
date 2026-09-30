# backend-base

Railway backend template: Postgres (+pgvector/PostGIS/pg_trgm), Valkey, SeaweedFS (S3).

## Use as a Railway template

Drag `docker-compose.yml` onto a Railway project canvas (or feed it to the Template Creator) —
services and volumes import as staged changes. The file is an import spec, not a runtime config.

| Service   | Image                    | Port (internal) | Volume                     | Flags                                 |
| --------- | ------------------------ | --------------- | -------------------------- | ------------------------------------- |
| postgres  | `postgres:18`            | 5432            | `/var/lib/postgresql/data` | `POSTGRES_PASSWORD`                   |
| valkey    | `valkey/valkey:9-alpine` | 6379            | `/data`                    | `--appendonly yes`                    |
| seaweedfs | `chrislusf/seaweedfs`    | 8333            | `/data`                    | `server -s3 -dir=/data -s3.port=8333` |

- Extensions (`vector`, `postgis`, `pg_trgm`, `unaccent`) are created on first boot by `postgres/init-extensions.sql`.
- Auth model: postgres only (`${POSTGRES_PASSWORD}`); valkey and seaweedfs run unauthenticated **by design** — this is a backend template for Railway private networking, behind the API. Never expose 6379/8333 publicly; add `-s3.auth`/`requirepass` only if that changes.
- `${POSTGRES_PASSWORD}` is a Railway template variable — prompted on deploy. Locally: `POSTGRES_PASSWORD=change-me docker compose up --build`.
