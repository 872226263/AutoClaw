# AutoClaw

一个用于 **Android 自动化** 的 **Headless AutoXJS Bridge**。

AutoClaw 可以让电脑连接启用了 AutoXJS 的安卓设备，远程下发脚本、查看界面元素、执行自动化流程，而不依赖 VS Code 插件界面。

## 功能

- 通过 AutoXJS 自带的“连接电脑 / 调试服务”流程连接设备
- 远程运行 AutoXJS 脚本
- 保存脚本到手机
- 停止单个脚本或停止全部脚本
- 使用 AutoXJS 选择器查看当前界面元素
- 在手机端截图
- 通过一个很小的本地 HTTP bridge 做自动化调度

## 项目结构

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

## 依赖要求

- Node.js 18+
- 安卓端已安装 AutoXJS
- 手机和电脑处于同一局域网

## 安装

```bash
npm install
```

## 在 OpenClaw 中安装

如果你想把 AutoClaw 作为 OpenClaw 技能使用，最简单的方式就是直接把这个仓库 clone 到本地 skills 目录里。

例如：

```bash
git clone https://github.com/872226263/AutoClaw.git ~/.openclaw/workspace/skills/autoclaw
```

然后确保你的 OpenClaw 实例可以读取这个 skill 目录。

最基本的结构要求是：
- `SKILL.md` 位于仓库根目录
- 辅助脚本放在 `scripts/`
- 示例文件放在 `examples/`

满足这些后，OpenClaw 就可以把它当成普通本地技能来加载。

## 启动 Bridge

```bash
node scripts/server.js
```

默认端口：
- `9317`

健康检查：

```bash
curl http://127.0.0.1:9317/health
```

预期返回：

```json
{"ok":true,"connected":false,"port":9317}
```

## AutoXJS 下载

如果你需要安装 AutoXJS，建议直接到这个社区维护仓库获取：

- 仓库地址：<https://github.com/aiselp/AutoX>

这个项目本身不捆绑 APK，公开发布时也建议统一引导用户去上面的仓库下载和安装。

## 连接安卓设备

在安卓端：

1. 打开 AutoXJS
2. 使用内置的 **连接电脑 / 调试服务** 功能
3. 输入：

```text
<你的电脑IP>:9317
```

例如：

```text
192.168.1.10:9317
```

连接成功后，bridge 日志里会看到握手成功。

## 下发脚本

推荐使用 helper：

```bash
python3 scripts/send_run.py --name demo.js --code "toast('hello from AutoClaw')"
```

也可以发送一个文件：

```bash
python3 scripts/send_run.py --name demo.js --file ./examples/demo.js
```

## 常见 AutoXJS 操作示例

### Toast 提示

```javascript
toast("hello from AutoClaw")
```

### 弹窗

```javascript
dialogs.alert("AutoClaw", "Hello from AutoClaw")
```

### 启动 App

```javascript
launchApp("微信")
```

或者：

```javascript
app.launchPackage("com.tencent.mm")
```

### 按文本查找并点击

```javascript
var obj = text("登录").findOne(3000);
if (obj) obj.click();
```

### 输入文本

```javascript
setText("hello world")
```

### 手机端截图

```javascript
requestScreenCapture();
var img = captureScreen();
images.save(img, "/sdcard/autoclaw-shot.png");
log("saved screenshot: /sdcard/autoclaw-shot.png");
```

### 导出当前 UI 树

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

### 健康检查

```text
GET /health
```

### 执行命令

```text
GET /exec?cmd=run&path=remote.js&script=toast("hello")
```

当前支持的命令：
- `run`
- `save`
- `stop`
- `stopAll`

## 安全说明

- 仅建议在可信局域网内使用
- 没有鉴权之前，不要直接暴露到公网
- 涉及敏感 App 时，必须有人类明确确认
- 对风险较高的脚本，先审查再执行

## 当前限制

- 截图目前保存到手机本地，暂时不会自动回传到电脑
- UI 检查结果目前主要通过日志返回
- 结构化结果返回、文件回传仍是后续增强项

## Roadmap

- 截图自动回传
- 结构化 JSON 结果返回
- 多设备管理
- 鉴权
- 更高层的 click / input / screenshot / UI dump helper

## License

MIT（或你后续选择的开源协议）
