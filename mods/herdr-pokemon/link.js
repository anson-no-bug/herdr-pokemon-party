// Terminal Cmd+Click link handler for local files (including UTF-8/Chinese filenames, PDFs & file:// URIs).
import { exec, notify } from "herdr";

function resolveLocalPath(click) {
  if (click?.source?.machine) return null; // leave remote machine paths to Herdr
  const l = click?.link;
  if (!l) return null;
  if (l.kind === "file" && l.path) return l.path;

  let raw = l.kind === "url" ? l.url : l.raw;
  if (!raw) return null;
  raw = String(raw).trim();
  if (l.kind === "url" && !/^file:/i.test(raw)) return null;

  raw = raw.replace(/^file:\/\/(?:localhost)?/i, "");
  try { raw = decodeURIComponent(raw); } catch {}
  // Strip optional :line or :line:col diagnostic suffixes if file itself has them
  raw = raw.replace(/:\d+(?::\d+)?$/, "");
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("~/")) return raw;
  if (click?.source?.cwd) return `${click.source.cwd.replace(/\/+$/, "")}/${raw.replace(/^\.\//, "")}`;
  return null;
}

export async function handleLink(click) {
  const target = resolveLocalPath(click);
  if (!target) return "pass";

  const r = await exec("open", [target]).catch(() => null);
  if (r?.code === 0) return "handled";
  notify({ title: "Couldn't open file", body: target, level: "warning", timeout: 3000 });
  return "pass";
}
