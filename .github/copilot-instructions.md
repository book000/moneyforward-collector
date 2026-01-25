# GitHub Copilot Instructions

## プロジェクト概要

- 目的: MoneyForward の入出金明細を自動収集し、CSV/TSV/HTML/PNG 形式でエクスポートする
- 主な機能: MoneyForward への自動ログイン、カレンダービューからの取引データ収集、複数形式でのエクスポート、Docker コンテナでの定期実行
- 対象ユーザー: 開発者、個人の財務データ管理を自動化したいユーザー

## 共通ルール

- 会話は日本語で行う。
- PR とコミットは Conventional Commits に従う。`<description>` は日本語で記載する。
  - 例: `feat: ユーザー認証機能を追加`
- 日本語と英数字の間には半角スペースを入れる。

## 技術スタック

- 言語: TypeScript 5.9.3
- ランタイム: Node.js 24.13.0
- パッケージマネージャー: pnpm 10.28.1（必須、npm/yarn は使用不可）
- ブラウザ自動化: puppeteer-core 24.35.0
- ユーティリティ: @book000/node-utils 1.24.34（Logger など）

## コーディング規約

- フォーマット: Prettier を使用（設定は `.prettierrc.yml` 参照）
  - 行幅: 80 文字
  - インデント: 2 スペース
  - セミコロンなし、シングルクォート
- Lint: ESLint を使用（`eslint.config.mjs`、@book000/eslint-config 継承）
- TypeScript: Strict モード有効
  - `skipLibCheck` での回避は禁止
  - 暗黙の any、null チェック、未使用変数の検出を有効化
- 命名規則: プロジェクトの既存パターンに従う
- コメント: 日本語で記載
- エラーメッセージ: 英語で記載
- 関数・インターフェースには JSDoc を日本語で記載・更新すること

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

## テスト方針

- このプロジェクトにはテストフレームワークは含まれていない
- データ収集ユーティリティのため、ユニットテストや統合テストは未実装
- 動作確認は実際の MoneyForward 環境での手動テストで行う

## セキュリティ / 機密情報

- MoneyForward のメールアドレス・パスワードは設定ファイル（`CONFIG_PATH` 環境変数で指定）で管理し、Git にコミットしない
- プロキシの認証情報も設定ファイルで管理し、コミットしない
- ログに個人情報や認証情報を出力しない
- 環境変数や設定ファイルのサンプルのみをリポジトリに含める

## ドキュメント更新

以下のドキュメントを更新する場合は、同時に更新すること:

- `package.json`: 依存関係、スクリプト、バージョン情報
- `.github/copilot-instructions.md`（このファイル）: 新機能追加時
- `CLAUDE.md`、`AGENTS.md`、`GEMINI.md`: AI エージェント向けプロンプトファイル

## リポジトリ固有

- **アーキテクチャ**: シングルファイル設計（`src/main.ts` のみ）
- **Docker 実行**: entrypoint.sh により 1 時間ごとに自動再実行
- **設定ファイル**: JSON 形式（`CONFIG_PATH` 環境変数で指定）
  - `moneyforward.mail_address`: 必須
  - `moneyforward.password`: 必須
  - `moneyforward.base_url`: オプション（デフォルト: https://moneyforward.com）
  - `proxy`: オプション（server, username, password）
  - `puppeteer`: オプション（追加の Puppeteer オプション）
- **出力ディレクトリ**: 自動作成
  - `/data/csv/`: CSV エクスポート
  - `/data/tsv/`: TSV エクスポート
  - `/data/screenshot/`: PNG スクリーンショット
  - `/data/html/`: HTML スナップショット
- **集約ファイル**: `/data/all.csv`、`/data/all.tsv`（全期間のデータを統合）
- **Renovate**: 自動依存関係更新が有効（`renovate.json`）
  - Renovate が作成した PR に対して、追加コミットや更新を行わないこと
- **CI/CD**:
  - `nodejs-ci-pnpm.yml`: Lint/型チェック（push/PR 時）
  - `docker.yml`: Docker イメージビルド・公開（PR 時）
