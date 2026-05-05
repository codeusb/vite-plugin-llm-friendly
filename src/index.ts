import { Plugin, ResolvedConfig } from "vite";
import path from "node:path";
import fs from "node:fs";

export interface LLMFriendlyOptions {
  /**
   * Markdown 文件所在的根目录，相对于项目根目录
   * @default 'public'
   */
  mdDir?: string;
  /**
   * 基础路径，如果不配置则自动获取 Vite 的 base 配置
   */
  basePath?: string;
}

export default function llmFriendlyPlugin(
  options: LLMFriendlyOptions = {},
): Plugin {
  let config: ResolvedConfig;
  const { mdDir = "public" } = options;

  return {
    name: "vite-plugin-llm-friendly",

    // 获取 Vite 的最终配置
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    // 用于开发服务器和预览服务器的通用逻辑
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          handleRequest(req, res, next, config, options);
        });
      };
    },

    // 同时支持 vite preview
    configurePreviewServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          handleRequest(req, res, next, config, options);
        });
      };
    },
  };
}

function handleRequest(
  req: any,
  res: any,
  next: any,
  config: ResolvedConfig,
  options: LLMFriendlyOptions,
) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const basePath = options.basePath || config.base || "/";

  let urlPath = url.pathname;

  // 1. 处理 Base Path
  if (basePath !== "/" && urlPath.startsWith(basePath)) {
    urlPath = urlPath.slice(basePath.length - 1); // 保留起始斜杠
  }

  // 2. 映射逻辑：将 / 处理为 /index
  const cleanPath = urlPath === "/" || urlPath === "" ? "/index" : urlPath;

  // 3. 构建对应的 MD 文件路径
  const mdRelativePath = cleanPath.endsWith(".html")
    ? cleanPath.replace(/\.html$/, ".md")
    : `${cleanPath}.md`;

  const mdFilePath = path.join(
    config.root,
    options.mdDir || "public",
    mdRelativePath,
  );

  // 4. 设置 Link Header (让 LLM 知道有 Markdown 版本)
  const mdUrl =
    (basePath === "/" ? "" : basePath.replace(/\/$/, "")) + mdRelativePath;
  res.setHeader("Link", `<${mdUrl}>; rel="alternate"; type="text/markdown"`);

  // 5. 内容协商
  const accept = req.headers.accept || "";
  if (accept.includes("text/markdown")) {
    if (fs.existsSync(mdFilePath) && fs.statSync(mdFilePath).isFile()) {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Vary", "Accept");
      // 使用流式传输性能更好
      const stream = fs.createReadStream(mdFilePath);
      stream.pipe(res);
      return;
    }
  }

  // 6. 统一 Vary 处理
  const existingVary = res.getHeader("Vary");
  if (!existingVary) {
    res.setHeader("Vary", "Accept");
  } else if (
    typeof existingVary === "string" &&
    !existingVary.includes("Accept")
  ) {
    res.setHeader("Vary", `${existingVary}, Accept`);
  }

  next();
}
