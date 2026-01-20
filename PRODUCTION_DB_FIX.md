# Production Database Troubleshooting Guide

## Quick Diagnosis

If you see `{"code":"DB_UNAVAILABLE"}` on production:

1. **Open System Status Panel** (Admin Panel → System Status tab)
2. **Read the DB diagnostic** - it will show:
   - `hasDatabaseUrl`: Whether DATABASE_URL is set
   - `hostRedacted`: The database hostname (secrets hidden)
   - `canConnect`: Whether connection succeeded
   - `schemaValid`: Whether tables exist
   - `latencyMs`: Connection latency
   - `error`: Specific error message

---

## Common Issues & Fixes

### Issue: `hasDatabaseUrl = false`

**Cause:** No DATABASE_URL environment variable in production

**Fix:**
1. Go to Replit Deployment Settings → Secrets
2. Add `DATABASE_URL` with your PostgreSQL connection string
3. Redeploy

---

### Issue: `canConnect = false`

**Possible causes:**
- Database endpoint is paused (Neon auto-pauses after inactivity)
- Incorrect credentials
- Network/firewall issue

**Fix:**
1. Check Neon dashboard - enable/wake the endpoint if paused
2. Verify DATABASE_URL credentials are correct
3. Test connection from Neon dashboard

---

### Issue: `schemaValid = false`

**Cause:** Database connected but tables don't exist

**Fix:**
1. Run migrations: `npm run db:push`
2. Or use Drizzle Kit: `npx drizzle-kit push`
3. Redeploy

---

## Emergency Diagnostic Endpoint

If you cannot log in to access the Admin Panel, use the `/api/status/db` endpoint:

### Setup (one-time)

1. Add `STATUS_KEY` to your deployment secrets with a random string
2. Redeploy

### Usage

```bash
curl -H "x-status-key: YOUR_STATUS_KEY" https://your-domain.com/api/status/db
```

Response:
```json
{
  "hasDatabaseUrl": true,
  "envSource": "DATABASE_URL",
  "hostRedacted": "ep-cool-name-123456.us-east-1.aws.neon.tech",
  "canConnect": true,
  "latencyMs": 45,
  "schemaValid": true,
  "error": null,
  "timestamp": "2025-01-04T00:30:00.000Z"
}
```

---

## Environment Variable Priority

The server checks for database connection strings in this order:
1. `DATABASE_URL` (preferred)
2. `REPLIT_DATABASE_URL` (Replit auto-provisioned)
3. `POSTGRES_URL` (fallback)

First found is used.

---

## Health Endpoints

| Endpoint | Auth Required | Purpose |
|----------|---------------|---------|
| `/healthz` | No | Basic server alive check |
| `/healthz/db` | No | Database connectivity only |
| `/health` | No | Full health with DB status |
| `/api/status/db` | STATUS_KEY header | Detailed DB diagnostics |
| `/api/system/status` | Admin login | Full system status panel |
