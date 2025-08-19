// index.js
import express from "express";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

let targetUrl = "";
let rps = 0; // requisições por segundo
let successCount = 0;
let failCount = 0;
let interval = null;

// ------------------ SERVE HTML ------------------
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Stress Tester</title>
  <script>
    let ws;
    function connectWS() {
      ws = new WebSocket("ws://" + location.host);
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        document.getElementById("success").innerText = data.success;
        document.getElementById("fail").innerText = data.fail;
      };
    }
    window.onload = connectWS;
    function start() {
      const url = document.getElementById("url").value;
      const rps = document.getElementById("rps").value;
      fetch("/start?url=" + encodeURIComponent(url) + "&rps=" + rps);
    }
    function stop() {
      fetch("/stop");
    }
  </script>
  <style>
    body { font-family: sans-serif; background:#111; color:#eee; display:flex; flex-direction:column; align-items:center; padding:30px; }
    input, button { padding:10px; margin:5px; border-radius:8px; border:none; }
    button { background:#444; color:#fff; cursor:pointer; transition:0.3s; }
    button:hover { background:#666; }
    .card { background:#222; padding:20px; border-radius:16px; margin-top:20px; }
    h1 { font-size:24px; }
    .counter { font-size:20px; margin:10px 0; }
  </style>
</head>
<body>
  <h1>Stress Tester</h1>
  <input id="url" placeholder="https://site.com" style="width:300px"/>
  <input id="rps" type="number" placeholder="req/s" style="width:100px"/>
  <div>
    <button onclick="start()">▶️ Iniciar</button>
    <button onclick="stop()">⏹️ Parar</button>
  </div>
  <div class="card">
    <div class="counter">✅ Sucesso: <span id="success">0</span></div>
    <div class="counter">❌ Falha: <span id="fail">0</span></div>
  </div>
</body>
</html>
  `);
});

// ------------------ CONTROLE ------------------
app.get("/start", (req, res) => {
  targetUrl = req.query.url;
  rps = parseInt(req.query.rps || "0", 10);
  successCount = 0;
  failCount = 0;

  if (interval) clearInterval(interval);

  interval = setInterval(async () => {
    for (let i = 0; i < rps; i++) {
      fetch(targetUrl)
        .then(() => successCount++)
        .catch(() => failCount++);
    }
  }, 1000);

  res.send("Iniciado");
});

app.get("/stop", (req, res) => {
  if (interval) clearInterval(interval);
  interval = null;
  res.send("Parado");
});

// ------------------ WEBSOCKET ------------------
const server = app.listen(port, () => {
  console.log("Rodando em http://localhost:" + port);
});

const wss = new WebSocketServer({ server });

setInterval(() => {
  const stats = JSON.stringify({ success: successCount, fail: failCount });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(stats);
  });
}, 1000);
