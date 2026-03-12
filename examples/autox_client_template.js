// AutoXJS client template for AutoClaw
// Replace host with your server IP.

const SERVER_URL = "ws://192.168.1.100:9317";
let ws = null;

function log(msg) {
    console.log(msg);
    if (ws) {
        ws.send(JSON.stringify({
            type: "log",
            data: { log: String(msg) }
        }));
    }
}

function handleCommand(data) {
    const cmd = data.command;
    log("received command: " + cmd);

    if (cmd === "run") {
        // Minimal placeholder: just eval incoming script.
        // For production, replace with safer execution logic.
        try {
            eval(data.script);
        } catch (e) {
            log("run error: " + e);
        }
        return;
    }

    if (cmd === "save") {
        try {
            files.write("/sdcard/AutoX/" + data.name, data.script || "");
            log("saved: " + data.name);
        } catch (e) {
            log("save error: " + e);
        }
        return;
    }

    if (cmd === "stopAll") {
        log("stopAll requested");
        return;
    }

    if (cmd === "stop") {
        log("stop requested for: " + data.id);
        return;
    }
}

function connect() {
    ws = new WebSocket(SERVER_URL);

    ws.on("open", () => {
        log("connected to autoclaw bridge");
        ws.send(JSON.stringify({
            type: "hello",
            data: {
                device_name: device.brand + " " + device.model,
                app_version_code: 999
            }
        }));
    });

    ws.on("text", (text) => {
        try {
            const msg = JSON.parse(text);
            if (msg.type === "command") {
                handleCommand(msg.data || {});
            } else {
                log("received: " + text);
            }
        } catch (e) {
            log("parse error: " + e);
        }
    });

    ws.on("closing", () => log("socket closing"));
    ws.on("closed", () => log("socket closed"));
    ws.on("failure", (err) => log("socket failure: " + err));
}

connect();
