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

## Environment Variables

| Variable      | Description          | Default       |
|---------------|----------------------|---------------|
| `LOG_LEVEL`   | Log level            | `info`        |
| `PORT`        | Port to listen on    | `3000`        |
| `HOST`        | Address to listen on | `127.0.0.1`   |
| `CONFIG_PATH` | Configuration file   | `config.yaml` |
| `NODE_ENV`    | Set to `production` to disable pretty-printed logs | |

## Docker

```bash
docker run --rm -it --p 3000:3000 \
-v $(pwd)/config.yaml:/usr/src/app/config.yaml \
ghcr.io/tenxprotocols/http-exporter http-exporter -c config.yaml
```
