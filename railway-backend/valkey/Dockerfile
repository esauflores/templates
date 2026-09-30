# BSD-3-Clause, drop-in Redis replacement on 6379.
FROM valkey/valkey:9-alpine
# AOF on so the /data volume actually survives restarts (default is RDB-only).
CMD ["valkey-server", "--appendonly", "yes"]
