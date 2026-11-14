/**
 * 模板工具：tmpl keys — 模板与格式化
 */

export const name = "dsh-tmpl-tmpl-keys";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

function parseObj(t) { const o = JSON.parse(String(t)); if (!o || typeof o !== "object") throw new Error("需要 JSON 对象"); return o; }
function lines(t) { return String(t).split(/\r?\n/); }

const OPS = {
  tmpl_fill: (t, a) => { const o = parseObj(a); return String(t).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, k) => (o[k] === undefined ? m : String(o[k]))); },
  tmpl_fill_dollar: (t, a) => { const o = parseObj(a); return String(t).replace(/\$\{([\w.-]+)\}/g, (m, k) => (o[k] === undefined ? m : String(o[k]))); },
  tmpl_missing: (t, a) => { const o = parseObj(a); const keys = [...String(t).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]); const miss = [...new Set(keys)].filter((k) => o[k] === undefined); return miss.length ? "缺少: " + miss.join(", ") : "所有占位符都有值"; },
  tmpl_keys: (t) => [...new Set([...String(t).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]))].join(NL) || "没有占位符",
  sprintf: (t, a) => { const args = String(a || "").split(",").map((x) => x.trim()); let i = 0; return String(t).replace(/%[sdf]/g, (m) => { const v = args[i++]; if (m === "%d") return String(Math.floor(Number(v) || 0)); if (m === "%f") return String(Number(v) || 0); return v === undefined ? "" : v; }); },
  pad_left: (t, a) => { const n = Number(a) || 10; const pad = " "; return Array.from(String(t)).map((l) => l.length >= n ? l : pad.repeat(n - l.length) + l).join(NL); },
  pad_right: (t, a) => { const n = Number(a) || 10; const pad = " "; return lines(t).map((l) => l.length >= n ? l : l + pad.repeat(n - l.length)).join(NL); },
  zero_fill: (t, a) => { const n = Number(a) || 4; return lines(t).map((l) => l.trim().padStart(n, "0")).join(NL); },
  repeat_str: (t, a) => { const n = Math.min(1000, Math.max(1, Number(a) || 3)); return String(t).repeat(n); },
  center: (t, a) => { const n = Number(a) || 40; return lines(t).map((l) => { if (l.length >= n) return l; const left = Math.floor((n - l.length) / 2); return " ".repeat(left) + l + " ".repeat(n - l.length - left); }).join(NL); },
  align_columns: (t) => { const rows = lines(t).map((l) => l.split(/\s*\|\s*|\t/).map((x) => x.trim())); const w = []; rows.forEach((r) => r.forEach((c, i) => { w[i] = Math.max(w[i] || 0, c.length); })); return rows.map((r) => r.map((c, i) => c + " ".repeat(w[i] - c.length)).join(" | ")).join(NL); },
  text_box: (t, a) => { const n = Number(a) || 40; const top = "+" + "-".repeat(n + 2) + "+"; const body = lines(t).map((l) => { const s = " " + l + " ".repeat(Math.max(0, n - l.length)); return "|" + s + " |"; }).join(NL); return top + NL + body + NL + top; },
  banner: (t, a) => { const ch = String(a || "#"); return [ch.repeat(40), "  " + String(t), ch.repeat(40)].join(NL); },
  json_table: (t) => { const arr = JSON.parse(t); if (!Array.isArray(arr)) throw new Error("需要数组"); const keys = Array.from(new Set(arr.flatMap((o) => Object.keys(o)))); const rows = [keys].concat(arr.map((o) => keys.map((k) => (o[k] === undefined ? "" : String(o[k]))))); const w = keys.map((k, i) => Math.max(k.length, ...rows.slice(1).map((r) => r[i].length))); return rows.map((r) => r.map((c, i) => c.padEnd(w[i])).join(" | ")).join(NL); },
  key_value_build: (t) => { const o = parseObj(t); return Object.keys(o).map((k) => k + ": " + o[k]).join(NL); },
  key_value_parse: (t) => { const o = {}; lines(t).forEach((l) => { const i = l.indexOf(":"); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); return JSON.stringify(o, null, 2); },
  ini_build: (t) => { const o = parseObj(t); return Object.keys(o).map((k) => "[" + k + "]" + NL + Object.keys(o[k]).map((x) => x + "=" + o[k][x]).join(NL)).join(NL + NL); },
  ini_parse: (t) => { const o = {}; let cur = "default"; o[cur] = {}; lines(t).forEach((l) => { const s = l.trim(); if (!s || s.startsWith(";") || s.startsWith("#")) return; const m = s.match(/^\[(.+)\]$/); if (m) { cur = m[1]; o[cur] = o[cur] || {}; return; } const i = s.indexOf("="); if (i > 0) o[cur][s.slice(0, i).trim()] = s.slice(i + 1).trim(); }); return JSON.stringify(o, null, 2); },
};

export function apply(ctx, config) {
  void config;
  ctx.tools.register({
    name: "tmpl_keys",
    description: "tmpl keys",
    parameters: {
      text: { "type": "string", required: true, "description": "模板/文本" },
      a: { "type": "string", "description": "参数" },
    },
    output: TEXT_OUTPUT,
    async execute(args) {
      const t = args && args.text != null ? String(args.text) : "";
      const a = args && args.a != null ? String(args.a) : "";
      try {
        const fn = OPS["tmpl_keys"];
        if (!fn) throw new Error("未知操作");
        return { text: ["模板工具：tmpl keys", "=".repeat(52), String(fn(t, a)), "", "更多工具：" + SITE].join(NL) };
      } catch (e) {
        return { text: "处理失败: " + String((e && e.message) || e) };
      }
    },
  });
}
