---
name: autoclaw
description: Use AutoXJS to operate Android phones through a lightweight headless bridge. Trigger when the user wants to automate Android actions, control an Android phone with AutoXJS, run scripts on a connected phone, push scripts to AutoXJS, inspect device logs, capture screenshots, inspect current UI elements, click coordinates or text targets, input text, launch Android apps, or build a phone-automation workflow without relying on the VS Code plugin UI. Use this skill whenever the user mentions AutoXJS, Auto.js, Android automation, phone scripting, remote phone control, screenshots, UI tree inspection, or wants OpenClaw to drive an Android device.
---

# AutoClaw

AutoClaw is a headless AutoXJS bridge skill for Android automation.

Goal:
- Let OpenClaw operate an Android phone via AutoXJS
- Avoid depending on the VS Code plugin UI
- Reuse the same basic protocol shape used by the AutoXJS VS Code extension

## Current status

Already verified:
- phone can connect to the bridge
- bridge handshake works with AutoXJS built-in connect-to-computer flow
- remote `run` works
- AutoXJS logs flow back to the bridge

That means AutoClaw is already usable for script-based Android automation.

## Architecture

There are 3 pieces:

1. **Headless bridge server** on the computer
   - Accepts AutoXJS device connections over WebSocket
   - Exposes a tiny HTTP API for task submission
   - Sends `run`, `save`, `stop`, and `stopAll` commands

2. **AutoXJS client on Android**
   - Connects to the bridge server
   - Performs the handshake
   - Executes incoming commands
   - Returns logs / status

3. **OpenClaw skill workflow**
   - Starts/stops the bridge
   - Pushes scripts
   - Runs ad-hoc automation tasks
   - Reads logs and reports results

## Project layout

```text
skills/autoclaw/
├── SKILL.md
├── scripts/
│   ├── server.js
│   ├── protocol.md
│   └── send_run.py
└── examples/
    └── autox_client_template.js
```

## Start bridge

```bash
cd skills/autoclaw
node scripts/server.js
```

Default port:
- WebSocket / HTTP: `9317`

Health check:

```bash
curl http://127.0.0.1:9317/health
```

## Connect phone

Use the AutoXJS built-in “connect to computer / 调试服务 / 连接电脑” flow and connect to:

```text
<host>:9317
```

Example:

```text
192.168.100.99:9317
```

## Preferred execution method

When sending scripts, prefer the helper:

```bash
python3 skills/autoclaw/scripts/send_run.py --name demo.js --code "toast('hello')"
```

This avoids string escaping mistakes.

## Common operations

### 1. Toast

```javascript
toast("hello from autoclaw")
```

### 2. Alert dialog

```javascript
dialogs.alert("AutoClaw", "我是 FlashFox")
```

### 3. Launch app

```javascript
launchApp("微信")
```

or

```javascript
app.launchPackage("com.tencent.mm")
```

### 4. Click coordinates

```javascript
click(540, 1200)
```

### 5. Input text

```javascript
setText("hello world")
```

### 6. Find text and click

```javascript
var obj = text("登录").findOne(3000);
if (obj) {
  obj.click();
} else {
  log("未找到 登录");
}
```

### 7. Find element by id

```javascript
var obj = id("com.tencent.mm:id/jga").findOne(3000);
if (obj) {
  obj.click();
}
```

### 8. Dump current UI tree summary

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
  for (var i = 0; i < count; i++) {
    walk(node.child(i), depth + 1);
  }
}
walk(depth(0).findOne(2000), 0);
```

### 9. Screenshot to file

```javascript
requestScreenCapture();
var img = captureScreen();
images.save(img, "/sdcard/autoclaw-shot.png");
log("saved screenshot: /sdcard/autoclaw-shot.png");
```

### 10. Swipe

```javascript
swipe(500, 1600, 500, 400, 300);
```

## Practical guidance

### For screenshots
Current bridge confirms execution through logs, but does not yet pull files back automatically.

So for now:
- save screenshot to phone path
- log the path
- later add file pull or upload support

### For UI elements
AutoXJS can already inspect elements through:
- `text(...)`
- `id(...)`
- `desc(...)`
- `className(...)`
- `depth(...)`
- node walking via `findOne()` and child traversal

That means “获取界面元素” is already possible today through script execution.

### For reliable actions
Prefer this order:
1. query by `id`
2. query by `text` / `desc`
3. fallback to coordinates

Coordinates are the most fragile.

## Supported bridge commands

### run
```json
{
  "type": "command",
  "message_id": "...",
  "data": {
    "command": "run",
    "id": "/tmp/demo.js",
    "name": "/tmp/demo.js",
    "script": "toast('hello from clawdroid')"
  }
}
```

### save
Same shape as `run`, but `command` is `save`.

### stop
```json
{
  "type": "command",
  "message_id": "...",
  "data": {
    "command": "stop",
    "id": "/tmp/demo.js"
  }
}
```

### stopAll
```json
{
  "type": "command",
  "message_id": "...",
  "data": {
    "command": "stopAll"
  }
}
```

## Safety

- Treat Android automation as high-impact.
- Do not operate banking, payment, or other sensitive personal apps without explicit user confirmation.
- Prefer showing the exact script before execution when the action is risky.
- Keep the bridge bound to trusted networks only.
- Add authentication before exposing beyond a local network.

## Next upgrades

The next useful upgrades are:
- screenshot file pullback
- structured result return (JSON payloads, not only logs)
- helper generators for click/input/screenshot/ui-dump
- multiple device support
- authentication
