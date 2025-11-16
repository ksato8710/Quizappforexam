# Playwright MCP 導入手順（ワークスペース）

このプロジェクトでは、Playwright MCP（Model Context Protocol）サーバを利用して、LLM クライアントからブラウザ操作を自動化できます。視覚モデルを使わず、Playwright のアクセシビリティツリーを用いるため軽量・高速です。

## 前提
- Node.js 18+
- MCP 対応クライアント（VS Code / Claude / Codex など）

## ワークスペース設定
プロジェクトには VS Code などのワークスペース共有向け設定を用意しています。

- 設定ファイル: `.vscode/mcp.json`

```json
{
  "mcp": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headless",
        "--isolated",
        "--init-script",
        "tools/mcp/playwright-init.js"
      ]
    }
  }
}
```

> 備考: VS Code のユーザー設定（User Settings JSON）で追加する場合は `mcpServers` キーを使います。ワークスペース共有用のファイルでは `mcp` キーを使用します。

## 使い方（概要）
1. MCP クライアント側で「playwright」サーバを有効化（.vscode/mcp.json を認識させるか、クライアントの MCP 設定から追加）。
2. 開発サーバを別途起動（`npm run dev`）。
3. LLM からブラウザ操作を指示（例: 「http://localhost:3000 を開いて、統計→クイズ一覧→詳細→戻るを実行」など）。

### 認証トークンの注入
アプリは `localStorage.accessToken` を参照します。本プロジェクトでは `tools/mcp/playwright-init.js` を `--init-script` として指定しているため、各ページ読込前に `accessToken` を自動注入します。

## 補足オプション（必要時）
- `--viewport-size=1280x720` でビューポート固定
- `--timeout-navigation=60000` でナビゲーションタイムアウト調整
- `--user-data-dir=./.mcp-profile` で永続プロファイル

## 参考
- 公式: https://github.com/microsoft/playwright-mcp

