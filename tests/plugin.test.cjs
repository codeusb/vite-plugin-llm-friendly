const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Writable, PassThrough } = require("node:stream");

const { llmFriendlyPlugin, llmTxtPlugin } = require("../dist/index.cjs");

class MockResponse extends Writable {
  constructor() {
    super();
    this.headers = new Map();
    this.headersSent = false;
    this.statusCode = 200;
    this.body = "";
  }

  _write(chunk, _encoding, callback) {
    this.headersSent = true;
    this.body += chunk.toString();
    callback();
  }

  setHeader(name, value) {
    this.headers.set(name.toLowerCase(), value);
  }

  getHeader(name) {
    return this.headers.get(name.toLowerCase());
  }

  end(chunk) {
    if (chunk) this.body += String(chunk);
    this.headersSent = true;
    super.end();
  }
}

function setupMiddleware(plugin) {
  let middleware;
  plugin.configResolved({
    root: "",
    base: "/",
  });
  const install = plugin.configureServer({
    middlewares: {
      use(fn) {
        middleware = fn;
      },
    },
  });
  install();
  return middleware;
}

test("blocks path traversal requests for markdown mapping", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-friendly-"));
  fs.mkdirSync(path.join(tempRoot, "public"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "secret.md"), "secret");

  const plugin = llmFriendlyPlugin();
  plugin.configResolved({ root: tempRoot, base: "/" });
  let middleware;
  plugin.configureServer({
    middlewares: {
      use(fn) {
        middleware = fn;
      },
    },
  })();

  const req = { url: "/../../secret", headers: { accept: "text/markdown" } };
  const res = new MockResponse();
  let nextCalled = false;

  await new Promise((resolve) => {
    middleware(req, res, () => {
      nextCalled = true;
      resolve();
    });
  });

  assert.equal(nextCalled, true);
  assert.equal(res.body, "");
});

test("appends Link header instead of overwriting", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-friendly-"));
  fs.mkdirSync(path.join(tempRoot, "public"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "public/about.md"), "about");

  const plugin = llmFriendlyPlugin();
  plugin.configResolved({ root: tempRoot, base: "/" });
  let middleware;
  plugin.configureServer({
    middlewares: {
      use(fn) {
        middleware = fn;
      },
    },
  })();

  const req = { url: "/about", headers: { accept: "text/html" } };
  const res = new MockResponse();
  res.setHeader("Link", "</app.js>; rel=preload");

  await new Promise((resolve) => {
    middleware(req, res, resolve);
  });

  const link = String(res.getHeader("Link"));
  assert.match(link, /<\/app\.js>; rel=preload/);
  assert.match(link, /rel="alternate"; type="text\/markdown"/);
});

test("llm txt stream errors return 500", async () => {
  const originalExistsSync = fs.existsSync;
  const originalStatSync = fs.statSync;
  const originalCreateReadStream = fs.createReadStream;

  fs.existsSync = () => true;
  fs.statSync = () => ({ isFile: () => true });
  fs.createReadStream = () => {
    const stream = new PassThrough();
    process.nextTick(() => stream.emit("error", new Error("boom")));
    return stream;
  };

  try {
    const plugin = llmTxtPlugin();
    plugin.configResolved({ root: "/", base: "/" });
    let middleware;
    plugin.configureServer({
      middlewares: {
        use(fn) {
          middleware = fn;
        },
      },
    })();

    const req = { url: "/llms", headers: { accept: "text/plain" } };
    const res = new MockResponse();

    await new Promise((resolve) => {
      res.on("finish", resolve);
      middleware(req, res, resolve);
    });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body, "Internal Server Error");
  } finally {
    fs.existsSync = originalExistsSync;
    fs.statSync = originalStatSync;
    fs.createReadStream = originalCreateReadStream;
  }
});
