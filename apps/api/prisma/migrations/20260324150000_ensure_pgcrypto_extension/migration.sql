-- Safety net: ensure pgcrypto extension is available.
-- gen_random_uuid() is built-in since PostgreSQL 13, but this guarantees
-- compatibility if the database is ever running on an older version.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
