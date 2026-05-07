import { Plugin, ResolvedConfig, Connect } from "vite";
import path from "node:path";
import fs from "node:fs";

export interface LLMSTxtOptions {
  /**
   * @default 'public'
   */
  dir?: string;
  /**
   * @default true
   */
  injectLink?: boolean;
}

export function llmTxtPlugin(options: LLMSTxtOptions = {}): Plugin {
  let config: ResolvedConfig;
  const { dir = "public", injectLink = true } = options;

  return {
    name: "vite-plugin-llms-txt",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    transformIndexHtml(html) {
      if (!injectLink) return html;

      const basePath = config.base || "/";
      const llmsUrl = path.posix.join(basePath, "llms.txt");

      return {
        html,
        tags: [
          {
            tag: "link",
            attrs: {
              rel: "index",
              type: "text/plain",
              href: llmsUrl,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          handleLLMRequest(req, res, next, config, dir);
        });
      };
    },

    configurePreviewServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          handleLLMRequest(req, res, next, config, dir);
        });
      };
    },
  };
}

function handleLLMRequest(
  req: Connect.IncomingMessage,
  res: any,
  next: Connect.NextFunction,
  config: ResolvedConfig,
  dir: string,
) {
  if (!req.url) return next();

  const [urlPathname] = req.url.split("?");
  const basePath = config.base || "/";

  let relativePath = urlPathname;
  if (basePath !== "/" && relativePath.startsWith(basePath)) {
    relativePath = relativePath.slice(basePath.length - 1);
  }

  const isLLMS = /^\/(llms|llms-full)(\.txt)?$/.test(relativePath);

  if (isLLMS) {
    const filename = relativePath.endsWith(".txt")
      ? relativePath
      : `${relativePath}.txt`;

    const filePath = path.join(config.root, dir, filename);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Vary", "Accept");
      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });
      stream.pipe(res);
      return;
    }
  }

  next();
}
