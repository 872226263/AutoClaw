# AutoClaw

Headless AutoXJS bridge for Android automation.

AutoClaw lets a computer connect to an AutoXJS-enabled Android device, send scripts remotely, inspect UI, and build agent-driven mobile automation workflows without depending on the VS Code plugin UI.

## Features

- Connect AutoXJS devices through the built-in “connect to computer” flow
- Run remote AutoXJS scripts
- Save scripts to device
- Stop one script or stop all scripts
- Inspect current UI elements with AutoXJS selectors
- Capture screenshots on device
- Use a tiny local HTTP bridge for automation

## Project structure

```text
.
├── README.md
├── README.zh-CN.md
├── SKILL.md
├── examples/
│   └── autox_client_template.js
├── scripts/
│   ├── protocol.md
│   ├── send_run.py
│   └── server.js
├── package.json
└── package-lock.json
```

## Requirements

- Node.js 18+
- AutoXJS on Android
- Android device and computer on the same local network

## Install

```bash
npm install
```

## Start the bridge

```bash
node scripts/server.js
```

Default port:
- `9317`

Health check:

```bash
curl http://127.0.0.1:9317/health
```

Expected result:

```json
{"ok":true,"connected":false,"port":9317}
```

## Connect an Android device

On the Android side:

1. Open AutoXJS
2. Use the built-in **connect to computer / 调试服务 / 连接电脑** flow
3. Enter:

```text
<your-computer-ip>:9317
```

Example:

```text
192.168.1.10:9317
```

After the device connects, the bridge will log a successful handshake.

## Send a script

Use the helper script:

```bash
python3 scripts/send_run.py --name demo.js --code "toast('hello from AutoClaw')"
```

You can also send a file:

```bash
python3 scripts/send_run.py --name demo.js --file ./examples/demo.js
```

## Common AutoXJS examples

### Toast

```javascript
toast("hello from AutoClaw")
```

### Alert dialog

```javascript
dialogs.alert("AutoClaw", "Hello from AutoClaw")
```

### Launch app

```javascript
launchApp("微信")
```

or

```javascript
app.launchPackage("com.tencent.mm")
```

### Click by text

```javascript
var obj = text("登录").findOne(3000);
if (obj) obj.click();
```

### Input text

```javascript
setText("hello world")
```

### Screenshot on device

```javascript
requestScreenCapture();
var img = captureScreen();
images.save(img, "/sdcard/autoclaw-shot.png");
log("saved screenshot: /sdcard/autoclaw-shot.png");
```

### Dump current UI tree

```javascript
function walk(node, depth) {
  if (!node) return;
  var indent = new Array(depth + 1).join("  ");
  log(indent + JSON.stringify({
    text: node.text(),
    id: node.id(),
    desc: node.desc(),
    className: node.className(),
    clickable: node.clickable(),
    bounds: String(node.bounds())
  }));
  var count = node.childCount();
  for (var i = 0; i < count; i++) walk(node.child(i), depth + 1);
}
walk(depth(0).findOne(2000), 0);
```

## HTTP API

### Health

```text
GET /health
```

### Execute

```text
GET /exec?cmd=run&path=remote.js&script=toast("hello")
```

Supported commands:
- `run`
- `save`
- `stop`
- `stopAll`

## Security notes

- Keep the bridge on a trusted local network
- Do not expose it directly to the public internet without authentication
- Do not use it on sensitive apps without explicit human confirmation
- Review scripts before running risky actions

## Current limitations

- Screenshots are currently saved on the phone; they are not pulled back automatically yet
- UI inspection currently returns results through device logs
- Structured result return and file pullback are future improvements

## Roadmap

- Screenshot pullback
- Structured JSON result return
- Multi-device management
- Authentication
- Higher-level helpers for click/input/screenshot/UI dump

## License

MIT (or your chosen license)
