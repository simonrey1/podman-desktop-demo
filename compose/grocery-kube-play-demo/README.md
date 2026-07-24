<!--
Copyright (C) 2026 Red Hat, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
-->

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
