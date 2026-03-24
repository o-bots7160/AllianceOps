-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Helper function: promote a user to admin by email address
-- Usage: SELECT promote_to_admin('user@example.com');
CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id TEXT;
BEGIN
    SELECT "id" INTO target_user_id
    FROM "User"
    WHERE "email" = user_email;

    IF target_user_id IS NULL THEN
        RETURN 'No user found with email: ' || user_email;
    END IF;

    INSERT INTO "AdminUser" ("id", "userId", "createdAt")
    VALUES (gen_random_uuid()::text, target_user_id, NOW())
    ON CONFLICT ("userId") DO NOTHING;

    RETURN 'Promoted user ' || user_email || ' to admin';
END;
$$ LANGUAGE plpgsql;

-- Helper function: revoke admin by email address
-- Usage: SELECT revoke_admin('user@example.com');
CREATE OR REPLACE FUNCTION revoke_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id TEXT;
    rows_deleted INT;
BEGIN
    SELECT "id" INTO target_user_id
    FROM "User"
    WHERE "email" = user_email;

    IF target_user_id IS NULL THEN
        RETURN 'No user found with email: ' || user_email;
    END IF;

    DELETE FROM "AdminUser" WHERE "userId" = target_user_id;
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    IF rows_deleted = 0 THEN
        RETURN user_email || ' was not an admin';
    END IF;

    RETURN 'Revoked admin from ' || user_email;
END;
$$ LANGUAGE plpgsql;
