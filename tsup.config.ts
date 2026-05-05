import { defineConfig } from "tsup";

export default defineConfig({
  // 1. 入口文件
  entry: ["src/index.ts"],
  // 2. 输出格式：直接生成 ESM 和 CJS
  format: ["cjs", "esm"],
  // 3. 生成类型声明文件 (.d.ts)
  dts: true,
  // 4. 每次构建先清理目录
  clean: true,
  // 5. 这是一个关键点：注入 shims
  // 它会自动处理 ESM 里的 __dirname 或 CJS 里的 import.meta 等兼容性问题
  shims: true,
  // 6. 不压缩代码，方便用户调试插件
  minify: false,
  // 7. 自动排除所有 dependencies 和 peerDependencies
  external: ["vite"],
});
