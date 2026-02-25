# tenx-http-exporter

A flexible OpenMetrics exporter for HTTP (RPC and REST) endpoints.

## Installation

```bash
pnpm install -g .
```

## Usage

```bash
tenx-http-exporter --config ./config.yaml
```

## Docker

```bash
docker run --rm -it --p 3000:3000 \
-v $(pwd)/config.yaml:/usr/src/app/config.yaml \
ghcr.io/tenxprotocols/http-exporter http-exporter -c config.yaml
```
