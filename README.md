# Xiruo

Xiruo is a private, single-user web library for browsing comics and animation through isolated source adapters.

## Current milestone

- Responsive discovery surface with live nhentai content
- Unified comic and video source contracts
- Search and content-type filtering
- Source registry with duplicate and identity validation
- Source-scoped outbound URL policy with local-network blocking
- Optional source-only outbound proxy for private deployments
- Redirect-safe, timeout-aware HTTP client with response-size limits
- Per-source in-memory cookie isolation
- HMAC-signed, image-only streaming proxy
- nhentai v2 adapter for explore, search, details, and chapter images
- hanime1 HTML adapter for browse, search, details, and playback discovery (fixture-verified; live smoke test is opt-in)
- Real-source routes and smoke checks can be enabled in local private deployments
- Unit tests and production build verification
- Server-side comic favorites with disk-backed cover and page caching
- Offline-first comic details and reader fallback
- Docker Compose deployment for fnOS with a bind-mounted `/data` library

The application does not ship credentials or public-source access by default; private source access remains opt-in through local environment configuration.

## Development

```bash
npm install
npm run dev
```

When a private deployment needs the configured outbound proxy, keep the local-only gateway running in a second terminal:

```bash
npm run source-gateway
```

Verification:

```bash
npm run check
```

Never place real credentials in tracked files. Copy `.env.example` to a local `.env` only when a later milestone requires private source access.

## fnOS deployment

Xiruo can run as a Docker Compose project in fnOS. The container writes favorite metadata, covers, and every cached comic page under `/data`; bind that path to a persistent directory on a fnOS storage pool.

1. Copy `.env.fnos.example` to `.env.fnos`.
2. Set `XIRUO_DATA_PATH` to a directory on the desired fnOS disk and replace `XIRUO_PROXY_SECRET` with a random value of at least 32 characters.
3. In fnOS **Docker → Compose → Add project**, select this project directory and use `docker-compose.yml`. If starting from a terminal, run:

```bash
docker compose --env-file .env.fnos up -d --build
```

If the Docker Hub mirror configured on the host cannot pull the Node base image, set this in `.env.fnos` and build again:

```dotenv
XIRUO_NODE_IMAGE=public.ecr.aws/docker/library/node:22-bookworm-slim
```

4. Open `http://<fnOS-IP>:3000` (or the port configured by `XIRUO_PORT`).

Example storage mapping:

```dotenv
XIRUO_DATA_PATH=/vol1/1000/应用数据/Xiruo
```

When a comic is favorited, Xiruo resolves its metadata once, caches the cover first, then downloads pages sequentially with a small delay. The favorite card shows download progress and changes to `已离线` when the disk copy is complete. Cached details and pages are served locally before Xiruo attempts the upstream source.

Canceling a favorite removes its cached directory. Do not manually edit files below the mounted data directory while Xiruo is running.

### One-click fnOS deployment through GHCR

The repository includes `.github/workflows/publish-image.yml`, which publishes
multi-architecture `linux/amd64` and `linux/arm64` images to GitHub Container
Registry. The image name is generated from the repository automatically:

```text
ghcr.io/6kohi/xiruo:latest
```

First publish:

1. Create a GitHub repository and push this project to its default branch.
2. Open the repository's **Actions** page and wait for
   **Publish container image** to finish.
3. Open the generated package and change its visibility to public for passwordless
   fnOS pulls. A private package also works after `docker login ghcr.io` on fnOS
   with a GitHub personal access token that has `read:packages` permission.

For fnOS, copy `docker-compose.ghcr.yml` and `.env.ghcr.example` into a small
deployment directory. Rename `.env.ghcr.example` to `.env`, then set:

```dotenv
XIRUO_IMAGE=ghcr.io/6kohi/xiruo:latest
XIRUO_PORT=3100
XIRUO_DATA_PATH=/vol1/1000/docker/xiruo/data
```

The internal proxy secret is generated automatically when it is blank. Only an
external source gateway needs an explicitly shared `XIRUO_PROXY_SECRET`.

In fnOS **Docker → Compose → Add project**, import `docker-compose.ghcr.yml` and
start it. From an fnOS terminal, the equivalent command is:

```bash
docker compose -f docker-compose.ghcr.yml up -d
```

The first start pulls the published image instead of compiling source on the NAS.
To update after a new image has been published:

```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

The bind-mounted `/data` directory is not replaced during image upgrades. For a
controlled rollback, set `XIRUO_IMAGE` to a version tag such as `:1.0.0` and start
the Compose project again.
