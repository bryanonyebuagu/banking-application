# Podman development runtime

Decision: 2026-09-28. At the user's request, use Podman throughout local development and future database CI. Docker Desktop is no longer a prerequisite. Preserve Supabase, PostgreSQL, Auth, Storage and the existing project_id.

## Windows setup

Install the Podman engine (Podman Desktop is optional):

```powershell
winget install --exact --id RedHat.Podman --source winget
podman machine init
podman machine start
npm run db:start
```

Installation may require an interactive Windows administrator prompt. Podman uses WSL 2 on Windows. Preserve existing WSL distributions and data; never reset them to install Podman.

Database npm scripts inspect the selected Podman machine and explicitly bind Supabase to its pipe/socket. Set PODMAN_MACHINE for a non-default machine. DOCKER_HOST is only the compatibility protocol variable used by Supabase; Docker's engine and CLI are not required. Missing Podman stops execution rather than falling back to Docker. Use the npm scripts for all container-dependent Supabase commands.

On Linux, install Podman and start `systemctl --user start podman.socket`. On macOS initialize and start a Podman machine. Future database CI must provision Podman and use the same scripts. Existing foundation CI requires only Node and browser dependencies.

## Workflow

- `npm run db:start`: start the existing isolated stack.
- `npm run db:status`: inspect services; do not publish credential-bearing output.
- `npm run db:stop`: stop services while preserving data by default.
- `npm run db:reset`: destructive replay of the isolated local project's migrations.
- `npm run test:db`: database tests through Podman.
- `npm run db:types`: generate types from the local database.

Hosted deployment remains Next.js plus managed Supabase and requires no Docker. This decision does not authorize changes to a shared hosted database. Phase 2 still requires verified replay, upgrades, RLS, persistence and generated types.

Sources: https://supabase.com/docs/guides/local-development/cli/getting-started and https://podman-desktop.io/docs/migrating-from-docker/using-the-docker_host-environment-variable
