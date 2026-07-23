# Grocery kube play demo

Small demo used by Podman Desktop blog tutorials for:

1. Running a Compose stack with Podman.
2. Converting `docker-compose.yml` to Kubernetes YAML with `kompose`.
3. Running the generated YAML locally with `podman kube play`.

## Stack

- Web: static HTML
- API: TypeScript + Node.js HTTP + PostgreSQL
- Database: `registry.access.redhat.com/hi/postgresql:18.4`

## Run with Compose

```bash
podman compose up -d --build
```

Open:

- http://localhost:8080
- http://localhost:3000/health
- http://localhost:3000/api/items

## Convert to Kubernetes YAML

```bash
kompose convert --stdout -f docker-compose.yml > app-kube.yaml
```

## Run generated YAML

```bash
podman compose down
podman kube play --replace --publish-all app-kube.yaml
```

## Cleanup

```bash
podman compose down -v
podman kube down app-kube.yaml
```
