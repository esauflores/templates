# Backend base

Docker Compose services: PostgreSQL, Valkey, and SeaweedFS (S3).

```sh
cp .env.example .env
docker compose up -d
```

Services are available to each other by name on the Compose network:

- PostgreSQL: `postgres:5432`
- Valkey: `valkey:6379`
- SeaweedFS S3: `seaweedfs:8333`

Data is stored in named volumes. Ports are not published to the host; add `ports` mappings if you need host access.
