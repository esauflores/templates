FROM postgres:18

# pgvector + PostGIS from PGDG (apt repo preconfigured in the base image).
# pg_trgm/unaccent are contrib — already in the base image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    postgresql-18-pgvector \
    postgresql-18-postgis-3 \
    postgresql-18-postgis-3-scripts \
  && rm -rf /var/lib/apt/lists/*

# Runs once on first boot only.
COPY init-extensions.sql /docker-entrypoint-initdb.d/
