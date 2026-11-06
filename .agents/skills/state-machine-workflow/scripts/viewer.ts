import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { TaskMachineStore, digest } from "./store.ts";
import { graph } from "./machine.ts";

const [database, instance, portText = "5210", host = "127.0.0.1"] = process.argv.slice(2);
if (!database || !instance) throw new Error("Usage: node /path/to/state-machine-workflow/run.mjs view DATABASE INSTANCE [PORT] [HOST]");
const port = Number(portText);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port");
const store = new TaskMachineStore(database);
const assetDirectory = new URL("../.local/task-machine-viewer/", import.meta.url);
const assetPath = new URL("mermaid.min.js", assetDirectory);
const assetSha256 = "5a8ec91820bd55afef049068489369910e5d6ce70c8103952f27e29d3e76e8bc";
if (!existsSync(assetPath)) {
  const response = await fetch("https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.min.js");
  if (!response.ok) throw new Error("Could not download the pinned diagram renderer");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== assetSha256) throw new Error("Diagram renderer checksum mismatch");
  mkdirSync(assetDirectory, { recursive: true });
  writeFileSync(assetPath, bytes);
}
const mermaid = readFileSync(assetPath);
if (digest(mermaid) !== assetSha256) throw new Error("Cached diagram renderer checksum mismatch");
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Live state machine</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f2f5f9;color:#182235;font:15px system-ui,sans-serif}header{background:#142033;color:white;padding:22px 30px}h1{font-size:22px;margin:0 0 6px}header p{margin:0;color:#bdcadb}.bar{display:flex;gap:28px;align-items:center;flex-wrap:wrap;padding:18px 30px;background:white;border-bottom:1px solid #dce2eb}.bar strong{display:block;font-size:19px;margin-top:3px}.badge{padding:7px 12px;border-radius:20px;background:#e8eef7;color:#24426d}#connection{margin-left:auto;color:#64748b;font-size:13px}main{padding:20px 28px}.hint{color:#526277;margin:0 0 12px}#diagram{background:white;border:1px solid #dce2eb;border-radius:12px;overflow:auto;padding:20px;min-height:300px}#diagram svg{max-width:100%!important;height:auto;display:block;margin:auto}#diagram text{font-family:system-ui,sans-serif!important}.ready .active{animation:pulse 1.8s ease-in-out infinite}@keyframes pulse{50%{filter:drop-shadow(0 0 7px #2563eb)}}@media(prefers-reduced-motion:reduce){.ready .active{animation:none}}.error{color:#b42318!important}
</style><header><h1>Live state machine</h1><p id="instance">Connecting to persisted state…</p></header><div class="bar"><div>Current state<strong id="state">—</strong></div><span class="badge" id="status">Connecting</span><div>Revision<strong id="revision">—</strong></div><div>Unresolved operations<strong id="pending">—</strong></div><span id="connection">Waiting for SQLite snapshot</span></div><main><p class="hint">The highlighted node is the current state. The assistant controls execution. This view refreshes every second and cannot change the machine.</p><div id="diagram">Loading graph…</div></main><script src="/mermaid.js"></script><script>
mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral',fontFamily:'system-ui',state:{useMaxWidth:false}});
let key='',busy=false;const el=id=>document.getElementById(id);
async function refresh(){if(busy)return;busy=true;try{const response=await fetch('/api/state',{cache:'no-store'});if(!response.ok)throw Error('Snapshot unavailable');const value=await response.json();const next=value.definitionHash+':'+value.revision;const status=!value.compatible?'Incompatible runtime':value.stopped?'Stopped':value.pending?'Unresolved operation':value.final?'Final':'Ready';el('instance').textContent=value.id;el('state').textContent=value.state;el('status').textContent=status;el('revision').textContent=value.revision;el('pending').textContent=value.pending;if(next!==key){const rendered=await mermaid.render('machine-'+value.revision,value.diagram);el('diagram').innerHTML=rendered.svg;key=next;}el('diagram').classList.toggle('ready',status==='Ready');el('connection').textContent='Live · checked '+new Date().toLocaleTimeString();el('connection').classList.remove('error');}catch(error){el('connection').textContent='Disconnected · last snapshot retained';el('connection').classList.add('error');el('diagram').classList.remove('ready');}finally{busy=false;}}
refresh();setInterval(refresh,1000);
</script></html>`;
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET") { response.writeHead(405); response.end(); return; }
  if (request.url === "/") { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(page); return; }
  if (request.url === "/mermaid.js") { response.setHeader("Content-Type", "text/javascript; charset=utf-8"); response.end(mermaid); return; }
  if (request.url === "/api/state") {
    try {
      const value = store.inspect(instance);
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ id: value.id, state: value.state, revision: value.revision, stopped: value.stopped === 1,
        pending: value.operations.filter(operation => operation.status === "unknown").length, compatible: value.runtimeCompatible,
        final: value.definition.states[value.state]?.final === true,
        definitionHash: value.definition_hash, diagram: graph(value.definition, value.state) }));
    } catch { response.writeHead(503); response.end('{"error":"Snapshot unavailable"}'); }
    return;
  }
  response.writeHead(404); response.end();
});
server.listen(port, host, () => process.stdout.write(JSON.stringify({ url: 'http://localhost:' + port, instance }) + "\n"));
function close(): void { server.close(() => { store.close(); }); }
process.once("SIGINT", close); process.once("SIGTERM", close);
