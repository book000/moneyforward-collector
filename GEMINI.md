# Gemini CLI 向けプロンプト

## 目的

このドキュメントは、Gemini CLI がこのプロジェクトで作業する際のコンテキストと作業方針を定義します。Gemini CLI は、SaaS 仕様、言語・ランタイムのバージョン差、料金・制限・クォータといった、最新の適切な情報が必要な外部依存の判断や、外部一次情報の確認、最新仕様の調査、外部前提条件の検証を行う際に使用されます。

## 出力スタイル

### 言語

- **会話言語**: 日本語
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語

### トーン

- 明確で簡潔な説明
- 技術的に正確な情報提供
- 必要に応じて出典や参照元を明記

### 形式

- 構造化された情報提供（箇条書き、表など）
- 複雑な情報は段階的に説明
- 重要なポイントは強調

## 共通ルール

### 言語使用ルール

- **会話言語**: 日本語
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語
- **日本語と英数字の間**: 半角スペースを挿入

### コミット規約

- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: ユーザー認証機能を追加`

- **ブランチ命名**: [Conventional Branch](https://conventional-branch.github.io) に従う
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix, docs など）を使用
  - 例: `feat/add-user-auth`

## プロジェクト概要

### 目的

MoneyForward の入出金明細を自動収集し、CSV/TSV/HTML/PNG 形式でエクスポートする。

### 主な機能

- **自動ログイン**: Puppeteer を使用した MoneyForward への自動ログイン
- **データ収集**: カレンダービューからの取引データ収集
- **複数形式エクスポート**: CSV、TSV、HTML、PNG 形式での出力
- **データ集約**: 複数期間のデータを統合した集約ファイル生成
- **定期実行**: Docker コンテナで 1 時間ごとに自動実行

### 技術スタック

- **言語**: TypeScript 5.9.3
- **ランタイム**: Node.js 24.13.0
- **パッケージマネージャー**: pnpm 10.28.1（必須）
- **ブラウザ自動化**: puppeteer-core 24.35.0
- **ユーティリティ**: @book000/node-utils 1.24.34
- **Lint/Format**: ESLint 9.39.2、Prettier 3.8.1

## コーディング規約

### フォーマット

- **Prettier** を使用（`.prettierrc.yml` 参照）
  - 行幅: 80 文字
  - インデント: 2 スペース
  - セミコロンなし
  - シングルクォート
  - トレーリングカンマ（ES5）

### Lint

- **ESLint** を使用（`eslint.config.mjs`）
  - @book000/eslint-config 継承
  - Strict ルール適用

### TypeScript

- Strict モード有効
- `skipLibCheck` での回避は禁止
- 暗黙の any、null チェック、未使用変数の検出を有効化

### 命名規則

- 変数名・関数名: キャメルケース
- 型名・インターフェース名: パスカルケース
- プロジェクトの既存パターンに従う

### コメントと docstring

- **コメント**: 日本語で記載
- **docstring**: 関数・インターフェースに JSDoc を日本語で記載・更新すること

## 開発コマンド

```bash
# 依存関係のインストール
pnpm install

# 開発（ウォッチモード）
pnpm dev

# 本番実行
pnpm start

# Lint チェック（全体: prettier, eslint, tsc）
pnpm lint

# Lint 個別実行
pnpm lint:prettier  # コードフォーマットチェック
pnpm lint:eslint    # ESLint チェック
pnpm lint:tsc       # TypeScript 型チェック

# 自動修正
pnpm fix            # prettier と eslint の自動修正
pnpm fix:prettier   # コードフォーマット自動修正
pnpm fix:eslint     # ESLint 自動修正
```

## 注意事項

### 認証情報のコミット禁止

以下の情報は、設定ファイル（`CONFIG_PATH` 環境変数で指定）で管理し、Git にコミットしない:

- MoneyForward のメールアドレス・パスワード
- プロキシの認証情報
- その他の機密情報

### ログへの機密情報出力禁止

- 個人情報（メールアドレス、氏名など）
- 認証情報（パスワード、トークンなど）
- その他のセンシティブな情報

### 既存ルールの優先

- プロジェクト固有の設定やルールがある場合は、それを優先する
- 不明な点があれば、他のエージェント（Claude Code、Codex CLI）に確認する

### 既知の制約

- **パッケージマネージャー**: pnpm が必須（npm/yarn は使用不可）
- **アーキテクチャ**: シングルファイル設計（`src/main.ts` のみ）
- **テスト**: テストフレームワークは含まれていない（手動テストで確認）
- **Renovate**: Renovate が作成した PR に対して、追加コミットや更新を行わないこと

## リポジトリ固有

### 設定ファイル

`CONFIG_PATH` 環境変数で指定する JSON 形式:

```typescript
interface Config {
  moneyforward: {
    base_url?: string              // デフォルト: https://moneyforward.com
    mail_address: string            // 必須
    password: string                // 必須
  }
  proxy?: {
    server: string                  // プロキシサーバー URL
    username?: string              // オプション（プロキシ認証）
    password?: string              // オプション（プロキシ認証）
  }
  puppeteer?: Record<string, unknown>  // 追加の Puppeteer オプション
}
```

### Docker 環境変数

```bash
TZ=Asia/Tokyo
NODE_ENV=production
CONFIG_PATH=/data/config.json
CHROMIUM_PATH=/usr/bin/chromium-browser
LOG_DIR=/data/logs/
USER_DATA_BASE=/data/userdata
```

### 出力ディレクトリ（自動作成）

- `/data/csv/`: CSV エクスポート
- `/data/tsv/`: TSV エクスポート
- `/data/screenshot/`: PNG スクリーンショット（フルページ）
- `/data/html/`: HTML スナップショット（絶対 URL 変換済み）

### 集約ファイル

- `/data/all.csv`: すべての収集期間から集約した CSV
- `/data/all.tsv`: すべての収集期間から集約した TSV

### Docker 実行

- **ベースイメージ**: zenika/alpine-chrome:with-puppeteer-xvfb（Alpine Linux with Chromium and XVFB）
- **自動再実行**: entrypoint.sh により、アプリケーションを 1 時間ごとに実行
- **エラー時の動作**: エラー時も継続（`|| true`）

### Node バージョン管理

- `.node-version` ファイルを使用（nvm/fnm 互換）
- 現在: Node.js 24.13.0

### CI/CD ワークフロー

1. **Node CI** (`nodejs-ci-pnpm.yml`):
   - トリガー: main/master へのプッシュ、main/master への PR
   - 実行内容: lint、型チェック、その他検証

2. **Docker CI** (`docker.yml`):
   - トリガー: PR の作成・同期・再オープン・クローズ
   - Docker イメージをビルド: `book000/moneyforward-collector`
   - GitHub Container Registry に公開

### Renovate 設定

- `github>book000/templates//renovate/base-public` を継承
- 依存関係更新の PR を自動作成
- Renovate が作成した PR に対して、追加コミットや更新を行わないこと

## Gemini CLI の役割

Gemini CLI は、以下のような場合に相談を受けます:

- **SaaS 仕様の確認**: MoneyForward の最新 API 仕様や UI 変更
- **バージョン差の調査**: Node.js、TypeScript、Puppeteer などのバージョン間の差異
- **料金・制限・クォータ**: 外部サービスの料金体系や制限事項
- **最新情報の確認**: 最新のライブラリ仕様、セキュリティ情報、ベストプラクティス
- **外部一次情報の確認**: 公式ドキュメント、リリースノート、変更履歴の調査

回答する際は、以下を心がけてください:

- 情報源を明記する（公式ドキュメント、リリースノートなど）
- 最新情報であることを確認する
- 不確実な情報の場合は、その旨を明示する
- 複数の情報源がある場合は、比較して最も信頼性の高い情報を提供する
