/**
 * THROWAWAY PROTOTYPE for GitHub issue #307.
 *
 * Question: do read-only Character-list and Battle-state cards make canonical
 * MCP results easier to inspect in ChatGPT without becoming another control or
 * state surface?
 */

export const SRD_PLAY_WIDGET_MIME_TYPE = "text/html;profile=mcp-app";

export const srdPlayWidgetResourceUris = {
  characterList: "ui://srd-play/character-list/v1.html",
  battleState: "ui://srd-play/battle-state/v1.html",
} as const;

type SrdPlayWidgetKind = keyof typeof srdPlayWidgetResourceUris;

type SrdPlayWidgetResource = {
  readonly name: string;
  readonly title: string;
  readonly uri: (typeof srdPlayWidgetResourceUris)[SrdPlayWidgetKind];
  readonly description: string;
  readonly mimeType: typeof SRD_PLAY_WIDGET_MIME_TYPE;
};

const widgetResources: Record<SrdPlayWidgetKind, SrdPlayWidgetResource> = {
  characterList: {
    name: "srd-play-character-list",
    title: "SRD Play Character list",
    uri: srdPlayWidgetResourceUris.characterList,
    description:
      "Read-only presentation of the canonical list_characters result.",
    mimeType: SRD_PLAY_WIDGET_MIME_TYPE,
  },
  battleState: {
    name: "srd-play-battle-state",
    title: "SRD Play Battle state",
    uri: srdPlayWidgetResourceUris.battleState,
    description:
      "Read-only presentation of the canonical read_battle_state result.",
    mimeType: SRD_PLAY_WIDGET_MIME_TYPE,
  },
};

export const srdPlayWidgetResources = Object.values(widgetResources);

const sharedStyles = String.raw`
  :root {
    color-scheme: light dark;
    font-family: ui-sans-serif, system-ui, sans-serif;
    --border: color-mix(in srgb, currentColor 18%, transparent);
    --muted: color-mix(in srgb, currentColor 62%, transparent);
    --panel: color-mix(in srgb, Canvas 94%, currentColor 6%);
    --accent: #6d5bd0;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 12px; background: Canvas; color: CanvasText; }
  main { display: grid; gap: 10px; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  h1 { margin: 0; font-size: 1rem; }
  h2 { margin: 0; font-size: .95rem; }
  p { margin: 0; }
  .muted { color: var(--muted); font-size: .8rem; }
  .empty, .error { border: 1px dashed var(--border); border-radius: 10px; padding: 14px; }
  .error { border-color: #b42318; }
  .stack { display: grid; gap: 8px; }
  .row, .focus { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: var(--panel); }
  .focus { border-left: 4px solid var(--accent); }
  .row-title { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  .pill { border: 1px solid var(--border); border-radius: 999px; padding: 2px 7px; font-size: .72rem; white-space: nowrap; }
  .facts { display: flex; flex-wrap: wrap; gap: 5px 12px; margin-top: 7px; font-size: .82rem; }
  .meter { height: 5px; margin-top: 7px; overflow: hidden; border-radius: 999px; background: var(--border); }
  .meter > span { display: block; height: 100%; background: var(--accent); }
  details { margin-top: 8px; }
  summary { cursor: pointer; font-size: .8rem; color: var(--muted); }
  pre { overflow: auto; max-height: 240px; margin: 7px 0 0; padding: 8px; border-radius: 7px; background: color-mix(in srgb, Canvas 88%, currentColor 12%); font-size: .7rem; white-space: pre-wrap; word-break: break-word; }
  .act { padding: 7px 0; border-top: 1px solid var(--border); }
  .act:first-child { border-top: 0; }
  .act p { margin-top: 3px; font-size: .8rem; }
  @media (max-width: 420px) { body { padding: 8px; } .row-title { align-items: start; } }
`;

function widgetHtml(kind: SrdPlayWidgetKind): string {
  const title = kind === "characterList" ? "Character list" : "Battle state";
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SRD Play — ${title}</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <main id="root" aria-live="polite">
    <header><h1>${title}</h1><span class="muted">Waiting for tool result…</span></header>
  </main>
  <script>
    (() => {
      "use strict";
      const kind = ${JSON.stringify(kind)};
      const root = document.getElementById("root");
      const pending = new Map();
      let nextRequestId = 1;

      const escapeHtml = (value) => String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
      const json = (value) => escapeHtml(JSON.stringify(value, null, 2));
      const array = (value) => Array.isArray(value) ? value : [];
      const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
      const text = (value, fallback = "—") => typeof value === "string" && value.length > 0 ? value : fallback;
      const number = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
      const percentage = (current, maximum) => maximum > 0 ? Math.max(0, Math.min(100, current / maximum * 100)) : 0;

      function request(method, params) {
        const id = nextRequestId++;
        window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
        return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      }

      function notify(method, params) {
        window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
      }

      function rawDetails(data) {
        return '<details><summary>Raw canonical tool result</summary><pre>' + json(data) + '</pre></details>';
      }

      function renderInvalidResult(title, data) {
        root.innerHTML = '<header><h1>' + escapeHtml(title) + '</h1></header>' +
          '<p class="error">The structured tool result does not match the expected projection.</p>' + rawDetails(data);
      }

      function renderCharacterList(data) {
        if (!Array.isArray(data.characters)) {
          renderInvalidResult("Character list", data);
          return;
        }
        const characters = data.characters;
        if (characters.length === 0) {
          root.innerHTML = '<header><h1>Character list</h1><span class="pill">0</span></header>' +
            '<p class="empty">No Character Sheets in this Play Session.</p>' + rawDetails(data);
          return;
        }
        const rows = characters.map((character) => {
          const id = text(character.characterId, "Unknown Character");
          if (character.status === "inBattle") {
            return '<article class="row"><div class="row-title"><h2>' + escapeHtml(id) +
              '</h2><span class="pill">In Battle</span></div><div class="facts"><span>Battle <strong>' +
              escapeHtml(text(character.battleId)) + '</strong></span></div><details><summary>Build and companion facts</summary><pre>' +
              json({ build: character.build, companion: character.companion }) + '</pre></details></article>';
          }
          if (character.status !== "available") {
            return '<article class="error">Unknown Character Sheet status.<pre>' + json(character) + '</pre></article>';
          }
          const hp = object(character.hitPoints) ?? {};
          const current = number(hp.current);
          const maximum = number(hp.maximum);
          const displayName = text(character.displayName, id);
          const hitPoints = current === null || maximum === null ? "—" : current + " / " + maximum;
          const meter = current === null || maximum === null ? "" :
            '<div class="meter" aria-label="Hit Points"><span style="width:' + percentage(current, maximum) + '%"></span></div>';
          return '<article class="row"><div class="row-title"><h2>' + escapeHtml(displayName) +
            '</h2><span class="pill">Available</span></div><p class="muted">' + escapeHtml(id) +
            '</p><div class="facts"><span>Hit Points <strong>' + hitPoints +
            '</strong></span></div>' + meter + '<details><summary>Character Sheet resources</summary><pre>' +
            json({ hitDice: character.hitDice, spellSlots: character.spellSlots, pactSlots: character.pactSlots, resources: character.resources }) +
            '</pre></details><details><summary>Build and companion facts</summary><pre>' +
            json({ build: character.build, companion: character.companion }) + '</pre></details></article>';
        }).join("");
        root.innerHTML = '<header><h1>Character list</h1><span class="pill">' + characters.length +
          '</span></header><section class="stack">' + rows + '</section>' + rawDetails(data);
      }

      function combatantRow(combatant, currentActorId) {
        const id = text(combatant.combatantId, "Unknown combatant");
        const current = number(combatant.hp);
        const maximum = number(combatant.maxHp);
        const hitPoints = current === null || maximum === null ? "—" : current + " / " + maximum;
        const meter = current === null || maximum === null ? "" :
          '<div class="meter" aria-label="Hit Points"><span style="width:' + percentage(current, maximum) + '%"></span></div>';
        const conditions = array(combatant.conditions);
        const currentActor = id === currentActorId;
        return '<article class="' + (currentActor ? 'focus' : 'row') + '"><div class="row-title"><h2>' +
          escapeHtml(text(combatant.displayName, id)) + '</h2><span class="pill">Initiative ' +
          escapeHtml(combatant.initiative ?? "—") + '</span></div><p class="muted">' + escapeHtml(id) +
          (currentActor ? ' · Current actor' : '') + '</p><div class="facts"><span>Hit Points <strong>' + hitPoints +
          '</strong></span><span>Temporary HP <strong>' + escapeHtml(combatant.tempHp ?? "—") +
          '</strong></span><span>Armor Class <strong>' + escapeHtml(combatant.armorClass ?? "—") +
          '</strong></span><span>Conditions <strong>' + escapeHtml(conditions.length === 0 ? "None" : conditions.join(", ")) +
          '</strong></span></div>' + meter + '<details><summary>Turn and creature facts</summary><pre>' +
          json({ zeroHpLifecycle: combatant.zeroHpLifecycle, concentrating: combatant.concentrating, dodging: combatant.dodging, reactionAvailable: combatant.reactionAvailable, movement: combatant.movement, ammunitionStocks: combatant.ammunitionStocks, origin: combatant.origin }) +
          '</pre></details></article>';
      }

      function renderBattleState(data) {
        if (data.snapshot === null) {
          root.innerHTML = '<header><h1>Battle state</h1><span class="pill">Inactive</span></header>' +
            '<p class="empty">No active Battle in this Play Session.</p>' + rawDetails(data);
          return;
        }
        const snapshot = object(data.snapshot);
        if (snapshot === null || !Array.isArray(snapshot.combatants) ||
            !Array.isArray(snapshot.turnOrder) || !Array.isArray(data.availableActs)) {
          renderInvalidResult("Battle state", data);
          return;
        }
        const combatants = snapshot.combatants;
        const byId = new Map(combatants.map((combatant) => [combatant.combatantId, combatant]));
        const turnOrder = snapshot.turnOrder;
        const ordered = turnOrder.map((id) => byId.get(id)).filter(Boolean);
        for (const combatant of combatants) if (!ordered.includes(combatant)) ordered.push(combatant);
        const current = byId.get(snapshot.currentActorId);
        const acts = data.availableActs;
        const actsMarkup = acts.length === 0
          ? '<p class="muted">No available acts in this result.</p>'
          : acts.map((act) => '<article class="act"><strong>' + escapeHtml(text(act.label)) +
              '</strong><p>' + escapeHtml(text(act.summary)) + '</p><details><summary>Required fills and presentation</summary><pre>' +
              json({ subject: act.subject, initialHoles: act.initialHoles, presentation: act.presentation }) + '</pre></details></article>').join("");
        const unresolved = {
          transientBattleFills: object(data.session)?.transientBattleFills ?? null,
          pendingInterrupt: snapshot.pendingInterrupt ?? null,
        };
        root.innerHTML = '<header><h1>Battle state</h1><span class="pill">Round ' +
          escapeHtml(snapshot.round ?? "—") + '</span></header>' +
          (current ? '<section class="focus"><p class="muted">Current actor</p><h2>' +
            escapeHtml(text(current.displayName, current.combatantId)) + '</h2></section>' : '') +
          '<section class="stack" aria-label="Initiative order">' +
          ordered.map((combatant) => combatantRow(combatant, snapshot.currentActorId)).join("") + '</section>' +
          '<details><summary>Available acts (' + acts.length + ')</summary><section>' + actsMarkup + '</section></details>' +
          '<details><summary>Unresolved requirements</summary><pre>' + json(unresolved) + '</pre></details>' + rawDetails(data);
      }

      function render(value) {
        const data = object(value);
        if (data === null) {
          root.innerHTML = '<header><h1>' + (kind === "characterList" ? 'Character list' : 'Battle state') +
            '</h1></header><p class="error">The tool result is not a structured object.</p>';
          return;
        }
        if (kind === "characterList") renderCharacterList(data);
        else renderBattleState(data);
      }

      window.addEventListener("message", (event) => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;
        if (message.id !== undefined && pending.has(message.id)) {
          const requestState = pending.get(message.id);
          pending.delete(message.id);
          if (message.error) requestState.reject(message.error);
          else requestState.resolve(message.result);
          return;
        }
        if (message.method === "ui/notifications/tool-result") {
          render(message.params?.structuredContent);
        }
      }, { passive: true });

      const compatibilityResult = window.openai?.toolOutput?.structuredContent ?? window.openai?.toolOutput;
      if (compatibilityResult) render(compatibilityResult);

      request("ui/initialize", {
        appCapabilities: { availableDisplayModes: ["inline"] },
        appInfo: { name: "SRD Play read-only prototype", version: "0.1.0" },
        protocolVersion: "2026-01-26",
      }).then(() => notify("ui/notifications/initialized", {})).catch(() => {
        // A compatibility host can still supply window.openai.toolOutput.
      });
    })();
  </script>
</body>
</html>`;
}

const widgetHtmlByUri: ReadonlyMap<string, string> = new Map([
  [srdPlayWidgetResourceUris.characterList, widgetHtml("characterList")],
  [srdPlayWidgetResourceUris.battleState, widgetHtml("battleState")],
]);

export function readSrdPlayWidgetResource(uri: string): string | null {
  return widgetHtmlByUri.get(uri) ?? null;
}
