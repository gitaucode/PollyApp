# Seed accounts

Demo login credentials for local development and staging. Re-apply with:

```bash
cd worker
npm run db:seed        # production D1
npm run db:seed:local  # local wrangler dev DB
```

| Account | Email | Password | User | Notes |
|---------|-------|----------|------|-------|
| Demo | `demo@pollpop.app` | `PollyPop123!` | `u0` (Alex) | Has activity feed items and ties to seeded polls |
| Admin | `admin@pollpop.app` | `Admin1234!` | `u_admin` | Creator flag set in seed |

Password hashes use PBKDF2-SHA256 (100k iterations) with fixed salts so `seed.sql` stays stable.

Generate a new hash:

```bash
cd worker
npm run hash-password -- "YourPassword" "optional-base64-salt"
```

**Do not use these passwords in production** after public launch — rotate or remove seed accounts.
