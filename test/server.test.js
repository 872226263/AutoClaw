const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocketClient = require('websocket').client;
const { createServer } = require('../scripts/server');

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body) });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function connectClient(port) {
  return new Promise((resolve, reject) => {
    const client = new WebSocketClient();
    client.on('connectFailed', reject);
    client.on('connect', (connection) => resolve(connection));
    client.connect(`ws://127.0.0.1:${port}/`);
  });
}

test('health endpoint works before device connect', async () => {
  const port = 19317;
  const server = createServer({ host: '127.0.0.1', port });
  await server.listen();
  const result = await httpGetJson(`http://127.0.0.1:${port}/health`);
  assert.equal(result.status, 200);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.connected, false);
  await server.close();
});

test('exec returns 503 when no device is connected', async () => {
  const port = 19318;
  const server = createServer({ host: '127.0.0.1', port });
  await server.listen();
  const result = await httpGetJson(`http://127.0.0.1:${port}/exec?cmd=run&path=a.js&script=toast(1)`);
  assert.equal(result.status, 503);
  assert.equal(result.json.error, 'no_device_connected');
  await server.close();
});

test('device handshake marks server connected and receives run command', async () => {
  const port = 19319;
  const server = createServer({ host: '127.0.0.1', port });
  await server.listen();

  const connection = await connectClient(port);

  const helloReply = new Promise((resolve, reject) => {
    connection.on('message', (msg) => {
      if (msg.type !== 'utf8') return;
      const data = JSON.parse(msg.utf8Data);
      if (data.type === 'hello') resolve(data);
      if (data.type === 'command') resolve(data);
    });
    setTimeout(() => reject(new Error('timeout waiting for hello')), 3000);
  });

  connection.sendUTF(JSON.stringify({
    type: 'hello',
    data: {
      device_name: 'Test Device',
      app_version_code: 700,
    },
  }));

  const reply = await helloReply;
  assert.equal(reply.type, 'hello');
  assert.equal(reply.data, 'ok');

  const health = await httpGetJson(`http://127.0.0.1:${port}/health`);
  assert.equal(health.json.connected, true);

  const commandReply = new Promise((resolve, reject) => {
    connection.on('message', (msg) => {
      if (msg.type !== 'utf8') return;
      const data = JSON.parse(msg.utf8Data);
      if (data.type === 'command') resolve(data);
    });
    setTimeout(() => reject(new Error('timeout waiting for command')), 3000);
  });

  const execRes = await httpGetJson(`http://127.0.0.1:${port}/exec?cmd=run&path=test.js&script=toast(123)`);
  assert.equal(execRes.status, 200);
  assert.equal(execRes.json.ok, true);

  const cmd = await commandReply;
  assert.equal(cmd.type, 'command');
  assert.equal(cmd.data.command, 'run');
  assert.equal(cmd.data.name, 'test.js');

  connection.close();
  await server.close();
});
