# vite-plugin-llm-friendly 🤖

Make your Vite site more LLM-friendly. This suite of plugins automatically provides clean, structured Markdown and site indices specifically tailored for AI crawlers and Large Language Models.

## ✨ Features

- **llmFriendlyPlugin**: Implements **Content Negotiation**. Serves Markdown to AI agents and standard web pages to human users.
- **llmTxtPlugin**: Supports the [llms-txt.org](https://llms-txt.org/) standard. Provides site indices and automatically injects discovery tags.
- **High Performance**: Powered by Node.js **Streaming**, ensuring zero memory overhead and non-blocking I/O.
- **Zero Config**: Automatically detects Vite's `base` path; fully supports both development and preview modes.

## 📦 Installation

Install via your favorite package manager:

```bash
pnpm add vite-plugin-llm-friendly -D
# or
npm install vite-plugin-llm-friendly -D
```

## 🚀 Quick Start

Add the plugins to your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { llmFriendlyPlugin, llmTxtPlugin } from "vite-plugin-llm-friendly";

export default defineConfig({
  plugins: [
    // 1. Handles point-to-point mapping: Maps requests to corresponding .md files
    llmFriendlyPlugin(),

    // 2. Handles site indexing: Serves llms.txt and injects discovery tags
    llmTxtPlugin(),
  ],
});
```

## 🛠 Plugin Details

### 1. llmFriendlyPlugin (Markdown Adaptation)

When an AI requests your page (with the header `Accept: text/markdown`), the plugin looks for a matching `.md` file in the `public` directory and returns it directly.

- **URL**: `https://example.com/about`
- **Human Browser**: Sees the rendered `about.html` page.
- **AI Assistant**: Receives the clean `about.md` source code.

### 2. llmTxtPlugin (llms.txt Standard)

Supports the emerging standard for AI indexing.

- **Auto-Discovery**: Injects `<link rel="index" href="/llms.txt">` into the head of your `index.html`.
- **Path Compatibility**: Automatically handles requests for `/llms`, `/llms.txt`, `/llms-full`, and `/llms-full.txt`.

## ⚙️ Configuration

### llmFriendlyPlugin

| Option     | Type     | Default       | Description                                      |
| :--------- | :------- | :------------ | :----------------------------------------------- |
| `mdDir`    | `string` | `'public'`    | Directory where Markdown files are stored.       |
| `basePath` | `string` | `config.base` | Auto-retrieved from Vite's `base` configuration. |

### llmTxtPlugin

| Option       | Type      | Default    | Description                                                  |
| :----------- | :-------- | :--------- | :----------------------------------------------------------- |
| `dir`        | `string`  | `'public'` | Directory where `llms.txt` is located.                       |
| `injectLink` | `boolean` | `true`     | Whether to inject the discovery tag into the home page HTML. |

## 🔍 Verification

Use `curl` to simulate an AI request:

```bash
# Verify Markdown mapping
curl -H "Accept: text/markdown" http://localhost:5173/about

# Verify llms.txt index
curl http://localhost:5173/llms.txt
```

## 💡 Why do you need it?

Modern AI agents (such as Claude, SearchGPT, and Perplexity) are significantly better at parsing Markdown than complex HTML. By using this plugin, you can drastically reduce the **Token consumption** of AI reading your site and improve the accuracy of information extraction.

## License

MIT
