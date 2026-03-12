#!/usr/bin/env node
const http = require('http');
const url = require('url');
const { server: WebSocketServer } = require('websocket');

const PORT = Number(process.env.AUTOCLAW_PORT || process.env.CLAWDROID_PORT || 9317);
const HOST = process.env.AUTOCLAW_HOST || process.env.CLAWDROID_HOST || '0.0.0.0';
const DEBUG = false;
let device = null;

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function sendUTF(conn, payload) {
  conn.sendUTF(JSON.stringify(payload));
}

function commandPayload(command, data = {}) {
  return {
    type: 'command',
    message_id: makeId(),
    data: { command, ...data },
  };
}

const httpServer = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, connected: !!device, port: PORT }));
    return;
  }

  if (parsed.pathname === '/exec') {
    if (!device) {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'no_device_connected' }));
      return;
    }

    const { cmd, path, script } = parsed.query;
    if (!cmd) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'missing_cmd' }));
      return;
    }

    let payload;
    switch (cmd) {
      case 'run':
      case 'save':
        payload = commandPayload(cmd, {
          id: path || 'remote.js',
          name: path || 'remote.js',
          script: script || "toast('hello from clawdroid')",
        });
        break;
      case 'stop':
        payload = commandPayload('stop', { id: path || 'remote.js' });
        break;
      case 'stopAll':
        payload = commandPayload('stopAll', {});
        break;
      default:
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'unsupported_cmd' }));
        return;
    }

    sendUTF(device, payload);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, dispatched: payload }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

const wsServer = new WebSocketServer({
  httpServer,
  keepalive: true,
  keepaliveInterval: 10000,
});

wsServer.on('request', (request) => {
  const connection = request.accept();
  console.log(`[clawdroid] socket accepted from ${connection.socket.remoteAddress}:${connection.socket.remotePort}`);

  let attached = false;

  const handshakeTimer = setTimeout(() => {
    if (!attached) {
      console.log('[clawdroid] handshake timeout');
      try { connection.close(); } catch {}
    }
  }, 10000);

  connection.on('message', (message) => {
    try {
      if (message.type !== 'utf8') {
        if (DEBUG) console.log('[clawdroid] non-utf8 message ignored');
        return;
      }
      const msg = JSON.parse(message.utf8Data);
      if (DEBUG) console.log('[clawdroid] recv', msg);

      if (msg.type === 'hello') {
        attached = true;
        clearTimeout(handshakeTimer);
        device = connection;
        const data = msg.data || {};
        const appVersionCode = data.app_version_code || 0;
        const reply = appVersionCode >= 629
          ? { message_id: makeId(), data: 'ok', version: '1.110.0', debug: false, type: 'hello' }
          : { message_id: makeId(), data: '连接成功', debug: false, type: 'hello' };
        sendUTF(connection, reply);
        console.log(`[clawdroid] handshake complete: ${data.device_name || 'unknown-device'}`);
        return;
      }

      if (msg.type === 'ping') {
        sendUTF(connection, { type: 'pong', data: msg.data });
        return;
      }

      if (msg.type === 'log') {
        console.log(`[device-log] ${msg.data?.log || ''}`);
        return;
      }

      console.log('[clawdroid] recv:', msg);
    } catch (err) {
      console.error('[clawdroid] message parse error:', err.message);
    }
  });

  connection.on('close', (reasonCode, description) => {
    clearTimeout(handshakeTimer);
    if (device === connection) device = null;
    console.log(`[clawdroid] device disconnected reason=${reasonCode} desc=${description}`);
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[clawdroid] listening on http://${HOST}:${PORT}`);
  console.log(`[clawdroid] websocket endpoint ws://<host>:${PORT}`);
});
