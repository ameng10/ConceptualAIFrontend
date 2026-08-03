# Choose Your Database

Every generated app runs on **MongoDB by default**, but the database is swappable from `.env` alone — no code changes. The data layer goes through a single port (`src/utils/database.ts`), and adapters for the other databases ship inside every exported app.

If you have no preference, use MongoDB Atlas. It has a free tier, and it is the default the app was generated and tested against.

## The short version

Open your app's `.env` and pick one:

```dotenv
# Default: MongoDB (or any Mongo-compatible endpoint)
MONGODB_URL=mongodb+srv://...
DB_NAME=myapp

# — or Postgres (Supabase, Neon, RDS, local) —
DATABASE_PROVIDER=postgres
POSTGRES_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
DB_NAME=myapp

# — or Turso (libsql) —
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=libsql://your-db-yourname.turso.io
TURSO_AUTH_TOKEN=eyJ...
DB_NAME=myapp
```

`DB_NAME` stays meaningful everywhere: it is the Mongo database name, the Postgres schema, and the Turso table prefix.

## Get a MongoDB Atlas URL (free tier)

1. Create or sign in to a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
2. Create a free **M0** cluster. It is free indefinitely — 512 MB of storage, one free cluster per project.
3. Create a database user with a username and password. Use a generated password and save it; you cannot read it back later.
4. Open **Network Access** and add an IP access entry. See the warning below before choosing what to put here.
5. On your cluster, click **Connect** → **Drivers**.
6. Copy the connection string. It looks like:

   ```text
   mongodb+srv://myUser:myPassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

7. Replace `<username>` and `<password>` with the real values. If your password contains `@`, `:`, `/`, or other URL-reserved characters, percent-encode them or the string will not parse.

Put it in your backend `.env`:

```dotenv
MONGODB_URL=mongodb+srv://myUser:myPassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=myapp
JWT_SECRET=<at least 32 random characters>
```

Official guides: [Deploy a free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/) · [Connection strings](https://www.mongodb.com/docs/guides/atlas/connection-string/)

### About the IP allowlist

For **local development**, adding just your own IP is the tighter choice. Note that home IP addresses change, and you will have to update it when yours does.

For a **deployed app**, this is the single most common cause of "it worked locally but not in production."

Serverless hosts — Deno Deploy included — have **no fixed outbound IP addresses**, on any plan. There is no address to allowlist. If you allowlist only your laptop, your deployed backend cannot reach the database at all.

Your options:

- **Allowlist `0.0.0.0/0`** (allow access from anywhere). This is the normal choice for a free-tier Atlas cluster behind a serverless host, and it is what most deployments on this stack do. Your database is still protected by its username, password, and TLS — but that password is now the only thing protecting it, so make it long and random, and never commit it.
- **Use a paid Atlas tier with a private endpoint** (M10 and up), if network-level restriction is a requirement for you.
- **Host the database somewhere with predictable networking** and restrict there instead.

Pick deliberately. `0.0.0.0/0` is a reasonable, widely-used tradeoff for a small app — but it is a real tradeoff, not a formality.

## Provider notes

### MongoDB (default) — and Mongo-compatible endpoints

`DATABASE_PROVIDER=mongodb` (or unset). Point `MONGODB_URL` at MongoDB Atlas, a local `mongod`, or any endpoint speaking the Mongo wire protocol:

- **FerretDB** (open source, Postgres underneath — self-hosting without Mongo)
- **Azure Cosmos DB for MongoDB**
- **Amazon DocumentDB**

### Postgres (Supabase, Neon, anything Postgres 15+)

`DATABASE_PROVIDER=postgres` + `POSTGRES_URL`. Documents are stored as JSONB (one table per collection under the `DB_NAME` schema); the app's Mongo-style queries are translated by the built-in engine. Postgres **15 or newer** is required (unique indexes use `NULLS NOT DISTINCT`).

- **Neon**: use the connection string from the dashboard — it already carries `?sslmode=require`.
- **Supabase**: use the **session pooler** connection string (Dashboard → Connect → Session pooler), which looks like `postgresql://postgres.<ref>:<password>@aws-X-<region>.pooler.supabase.com:5432/postgres`. The direct `db.<ref>.supabase.co` host is IPv6-only and unreachable from most home and CI networks.

### Turso (libsql)

`DATABASE_PROVIDER=turso` + `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (from `turso db tokens create <db>` or the dashboard). Any libsql or `sqld` server URL (`libsql://`, `https://`, `http://`) works. Local `file:` databases are not supported by this adapter.

## What's supported (and what happens outside it)

The non-Mongo adapters implement the Mongo vocabulary the generated concept library actually uses — filters (`$eq`/`$ne`/`$gt`/`$gte`/`$lt`/`$lte`/`$in`/`$nin`/`$exists`/`$regex`/`$or`/`$and`, dotted paths, array matching), updates (`$set`/`$unset`/`$inc`/`$push`/`$pull`/`$addToSet`/`$setOnInsert`), upserts, `findOneAndUpdate`, unique and sparse and TTL indexes, `distinct`, `countDocuments`, projections, and `$match`/`$group` aggregation. Duplicate keys surface with Mongo's error contract (`code 11000`), so app logic behaves identically.

Anything outside that subset throws a clear `UnsupportedQueryError` naming the operator — loud, never silently wrong. If you hit one, run on `DATABASE_PROVIDER=mongodb` or adjust the query.

Two behavioral notes:

- **TTL timing**: expired documents disappear within about 60 seconds of expiry (matching Mongo's background deleter), not instantly.
- **Media and blob storage**: on Mongo, file uploads use GridFS; on other providers they are chunked into ordinary rows automatically.

## Validation status (measured 2026-07-09)

Every target below was validated with the port-conformance suite (23 checks covering the full operator surface) and/or the complete 40-concept library test suite (313 tests):

| Target | Conformance | Library suite |
|---|---|---|
| MongoDB Atlas | ✅ | ✅ 313/313 |
| FerretDB v2 (Docker) | ✅ 22/22 | ✅ 313/313 |
| Postgres 16 (Docker) | ✅ 23/23 | ✅ 313/313 |
| Neon (live) | ✅ 23/23 | — |
| Supabase session pooler (live) | ✅ 23/23 | — |
| Turso (live) | ✅ 23/23 | — |
| sqld / libsql server (Docker) | ✅ 23/23 | ✅ 313/313 |

Cosmos DB and DocumentDB are wire-compatible in principle but have not been measured; treat them as unvalidated.

## Next

- [Run Your Generated App Locally](./run-generated-app-locally.md)
- [Deploy Your App](./deploy-with-deno-deploy.md)
- [Troubleshooting](./troubleshooting.md)
