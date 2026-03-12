# AutoClaw Protocol Notes

This project borrows the basic protocol shape from the AutoXJS VS Code extension.

## Transport
- HTTP server and WebSocket server share the same port
- Default port: `9317`

## Handshake
Client sends:

```json
{
  "type": "hello",
  "data": {
    "device_name": "Android",
    "app_version_code": 999
  }
}
```

Server replies:

```json
{
  "type": "hello",
  "message_id": "...",
  "data": "ok",
  "version": "autoclaw-0.1.0",
  "debug": false
}
```

## Commands
Server sends `type = command` with a `data.command` field.

Supported v1 commands:
- `run`
- `save`
- `stop`
- `stopAll`

## HTTP helper endpoints

### GET /health
Returns server status.

### GET /exec?cmd=run&path=remote.js&script=...
Dispatches a command to the currently connected device.

This is intentionally tiny. Add auth before exposing it outside a trusted network.
