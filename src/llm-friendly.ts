import { Plugin, ResolvedConfig, Connect } from "vite";
import path from "node:path";
import fs from "node:fs";

export interface LLMFriendlyOptions {
  /**
   * @default 'public'
   */
  mdDir?: string;
  basePath?: string;
}

type ResolvedOptions = Required<LLMFriendlyOptions>;

export function llmFriendlyPlugin(options: LLMFriendlyOptions = {}): Plugin {
  let config: ResolvedConfig;
  let settings: ResolvedOptions;

  return {
    name: "vite-plugin-llm-friendly",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      settings = {
        mdDir: options.mdDir || "public",
        basePath: options.basePath || resolvedConfig.base || "/",
      };
    },

    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          handleRequest(req, res, next, config, settings);
        });
      };
    },

    configurePreviewServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          handleRequest(req, res, next, config, settings);
        });
      };
    },
  };
}

function handleRequest(
  req: Connect.IncomingMessage,
  res: any, // ServerResponse
  next: Connect.NextFunction,
  config: ResolvedConfig,
  settings: ResolvedOptions,
) {
  if (!req.url) return next();

  const [urlPathname] = req.url.split("?");
  const { basePath, mdDir } = settings;

  let relativePath = urlPathname;
  if (basePath !== "/" && relativePath.startsWith(basePath)) {
    relativePath = relativePath.slice(basePath.length - 1);
  }

  const cleanPath =
    relativePath === "/" || relativePath === ""
      ? "/index"
      : relativePath.replace(/\.html$/, "");
  const mdRelativePath = `${cleanPath}.md`;

  const mdFilePath = path.join(config.root, mdDir, mdRelativePath);

  // Only set Link/Vary headers when the corresponding .md file exists
  let mdFileExists = false;
  try {
    mdFileExists = fs.statSync(mdFilePath).isFile();
  } catch (e) {
    // File does not exist, skip
  }

  if (!mdFileExists) return next();

  const mdUrl = path.posix.join(basePath, mdRelativePath);
  res.setHeader("Link", `<${mdUrl}>; rel="alternate"; type="text/markdown"`);
  appendVaryHeader(res, "Accept");

  const accept = req.headers.accept || "";
  if (accept.includes("text/markdown")) {
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    const stream = fs.createReadStream(mdFilePath);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });
    stream.pipe(res);
    return;
  }

  next();
}

function appendVaryHeader(res: any, value: string) {
  const existing = res.getHeader("Vary");
  if (!existing) {
    res.setHeader("Vary", value);
    return;
  }

  const parts = Array.isArray(existing)
    ? existing
    : String(existing)
        .split(",")
        .map((s) => s.trim());

  if (!parts.includes(value)) {
    res.setHeader("Vary", [...parts, value].join(", "));
  }
}
