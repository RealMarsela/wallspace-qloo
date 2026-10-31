// Snapshot of the production KV namespace into the frozen copy's own namespace (used by deploy-nebius-freeze.sh).
//   node scripts/_freeze-kv.mjs <source-namespace-id> <target-title>     prints the target namespace id on stdout
// Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment (the script never prints them). Creates the target
// namespace if it does not exist, deletes keys that no longer exist in the source, and copies every key with its value and expiry.
const [src, title] = process.argv.slice(2);
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: acct } = process.env;
if (!src || !title || !token || !acct) throw new Error("usage: _freeze-kv.mjs <source-id> <target-title> (with Cloudflare credentials in the env)");
const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/storage/kv/namespaces`;
const headers = { Authorization: `Bearer ${token}` };
const api = async (path, init = {}) => {
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`KV API ${init.method ?? "GET"} ${path.split("?")[0]} -> ${res.status}`);
  return res;
};
const listKeys = async (id) => {
  const out = [];
  let cursor = "";
  do {
    const j = await (await api(`/${id}/keys?limit=1000${cursor ? `&cursor=${cursor}` : ""}`)).json();
    out.push(...j.result);
    cursor = j.result_info?.cursor ?? "";
  } while (cursor);
  return out;
};

const all = await (await api("?per_page=100")).json();
let target = all.result.find((n) => n.title === title);
if (!target) target = (await (await api("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) })).json()).result;

const srcKeys = await listKeys(src);
const entries = [];
for (const k of srcKeys) {
  const res = await api(`/${src}/values/${encodeURIComponent(k.name)}`);
  entries.push({ key: k.name, value: await res.text(), ...(k.expiration ? { expiration: k.expiration } : {}) });
}
const stale = (await listKeys(target.id)).map((k) => k.name).filter((n) => !srcKeys.some((s) => s.name === n));
if (stale.length) await api(`/${target.id}/bulk/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stale) });
for (let i = 0; i < entries.length; i += 100) {
  await api(`/${target.id}/bulk`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entries.slice(i, i + 100)) });
}
process.stderr.write(`kv snapshot: ${entries.length} keys copied, ${stale.length} stale removed\n`);
process.stdout.write(`${target.id}\n`);
