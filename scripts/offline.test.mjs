import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { webcrypto } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";
import test from "node:test";

const run = promisify(execFile);

async function fixture(t, transform = (path, bytes) => bytes) {
  const directory = await mkdtemp(join(tmpdir(), "hvacr-offline-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const files = {
    "index.html": "<html>Preview</html>",
    "data/full-baseline.json": '{"full":"baseline"}',
    "data/source/raw.jsonld": '{"@graph":[{"@id":"kept-reference"}]}',
    "assets/KaTeX_Main-Regular.woff2": "font-bytes",
    "assets/layout-worker.js": "worker-bytes",
  };
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(directory, path, ".."), { recursive: true });
    await writeFile(join(directory, path), content);
  }
  await run(process.execPath, ["scripts/prepare-offline.mjs", directory]);
  const source = await readFile(join(directory, "sw.js"), "utf8");
  const handlers = new Map();
  const stores = new Map([["unrelated-site-cache", new Map()]]);
  const requested = [];
  const base = "https://example.test/project-site/";
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(key) {
          return store.get(key)?.clone();
        },
        async put(key, response) {
          store.set(key, response.clone());
        },
      };
    },
    async delete(name) {
      return stores.delete(name);
    },
  };
  runInNewContext(source, {
    URL,
    Request,
    Response,
    crypto: webcrypto,
    caches,
    self: {
      location: { href: `${base}sw.js` },
      addEventListener: (type, handler) => handlers.set(type, handler),
    },
    fetch: async (request) => {
      requested.push(request.url);
      assert.ok(request.url.startsWith(base));
      assert.equal(request.cache, "reload");
      assert.equal(request.redirect, "error");
      const path = decodeURIComponent(request.url.slice(base.length));
      return new Response(
        transform(path, await readFile(join(directory, path))),
      );
    },
  });
  const install = () =>
    new Promise((resolve, reject) =>
      handlers.get("install")({
        waitUntil: (promise) => promise.then(resolve, reject),
      }),
    );
  const status = () =>
    new Promise((resolve, reject) =>
      handlers.get("message")({
        data: { type: "HVACR_OFFLINE_STATUS" },
        ports: [{ postMessage: resolve }],
        waitUntil: (promise) => promise.catch(reject),
      }),
    );
  const fetch = (url, mode = "cors") => {
    let response;
    handlers.get("fetch")({
      request: { url, mode, method: "GET" },
      respondWith: (promise) => {
        response = promise;
      },
    });
    return response;
  };
  return {
    directory,
    source,
    stores,
    requested,
    base,
    install,
    status,
    fetch,
    handlers,
  };
}

test("complete recursive release prepares and serves a fresh subpath navigation and unseen baseline offline", async (t) => {
  const app = await fixture(t);
  await app.install();
  const status = await app.status();
  assert.equal(status.ready, true);
  assert.equal(status.assetCount, 6);
  assert.equal(app.requested.length, 6);
  assert.equal(
    await (await app.fetch(app.base, "navigate")).text(),
    "<html>Preview</html>",
  );
  assert.equal(
    await (await app.fetch(`${app.base}data/source/raw.jsonld`)).text(),
    '{"@graph":[{"@id":"kept-reference"}]}',
  );
  assert.equal(
    await (
      await app.fetch(`${app.base}assets/KaTeX_Main-Regular.woff2`)
    ).text(),
    "font-bytes",
  );
  assert.equal(
    await (await app.fetch(`${app.base}assets/layout-worker.js`)).text(),
    "worker-bytes",
  );
  assert.equal(
    app.requested.length,
    6,
    "serving cached content did not use network",
  );
  assert.equal(app.fetch("https://outside.test/reference"), undefined);
  assert.equal(app.fetch("https://example.test/another-app/"), undefined);
  assert.equal(app.fetch(`${app.base}unknown.html`, "navigate"), undefined);
  assert.equal(app.stores.has("unrelated-site-cache"), true);
});

test("a changed dataset rejects the entire install without deleting another application cache", async (t) => {
  const app = await fixture(t, (path, bytes) =>
    path.includes("baseline") ? "changed-release" : bytes,
  );
  await assert.rejects(app.install(), /Build changed during preparation/);
  assert.deepEqual([...app.stores.keys()], ["unrelated-site-cache"]);
  assert.equal((await app.status()).ready, false);
});

test("missing retained assets remove readiness and never mix network releases into an old cache", async (t) => {
  const app = await fixture(t);
  await app.install();
  const ownCache = [...app.stores.entries()].find(([key]) =>
    key.startsWith("hvacr-m0-v1:"),
  )[1];
  ownCache.delete(`${app.base}data/full-baseline.json`);
  assert.equal((await app.status()).ready, false);
  const response = await app.fetch(`${app.base}data/full-baseline.json`);
  assert.equal(response.status, 503);
  assert.equal(app.requested.length, 6);
});

test("offline build is deterministic and activation does not force an open page to update", async (t) => {
  const app = await fixture(t);
  await run(process.execPath, ["scripts/prepare-offline.mjs", app.directory]);
  assert.equal(
    await readFile(join(app.directory, "sw.js"), "utf8"),
    app.source,
  );
  assert.doesNotMatch(app.source, /skipWaiting\s*\(|clients\.claim\s*\(/);
  await new Promise((resolve, reject) =>
    app.handlers.get("activate")({
      waitUntil: (promise) => promise.then(resolve, reject),
    }),
  );
  assert.deepEqual([...app.stores.keys()], ["unrelated-site-cache"]);
});
