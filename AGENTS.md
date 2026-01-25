# AI エージェント向けプロンプト

## 目的

このドキュメントは、一般的な AI エージェントがこのプロジェクトで作業する際の基本方針を定義します。

## 基本方針

### 言語使用ルール

- **会話言語**: 日本語
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語
- **日本語と英数字の間**: 半角スペースを挿入

### コミット規約

- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: ユーザー認証機能を追加`、`fix: ログイン処理のバグを修正`

- **ブランチ命名**: [Conventional Branch](https://conventional-branch.github.io) に従う
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix, docs など）を使用
  - 例: `feat/add-user-auth`、`fix/login-bug`

## 判断記録のルール

技術的な判断を行う際は、以下を必ず記録すること:

1. **判断内容**: 何を決定したかを明確に記載
2. **検討した代替案**: 考慮した他の選択肢を列挙
3. **採用理由**: 選択した案を採用した理由
4. **採用しなかった案とその理由**: なぜその案を選ばなかったかを明示
5. **前提条件**: 判断の前提となる条件
6. **仮定**: 判断時に行った仮定
7. **不確実性**: 不確実な要素や今後の検証が必要な点

**重要**: 仮定を事実のように扱わず、明示的に区別すること。

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

## 開発手順（概要）

### 1. プロジェクト理解

以下を確認してプロジェクトを理解する:

- `AGENTS.md`: プロジェクト概要、使用方法
- `package.json`: 依存関係、スクリプト
- `src/main.ts`: 全アプリケーションロジック（シングルファイル設計）

### 2. 依存関係インストール

```bash
# pnpm を使用（npm/yarn は使用不可）
pnpm install
```

### 3. 変更実装

- 既存のコードスタイルに従う
- TypeScript Strict モードに準拠
- `skipLibCheck` での回避は禁止
- 関数・インターフェースに JSDoc（日本語）を記載

### 4. テストと Lint/Format 実行

```bash
# Lint チェック（prettier, eslint, tsc）
pnpm lint

# 自動修正
pnpm fix

# 動作確認（開発モード）
pnpm dev
```

## コーディング規約

### フォーマット

- **Prettier** を使用（`.prettierrc.yml` 参照）
  - 行幅: 80 文字
  - インデント: 2 スペース
  - セミコロンなし、シングルクォート

### Lint

- **ESLint** を使用（`eslint.config.mjs`）
  - @book000/eslint-config 継承
  - Strict ルール適用

### TypeScript

- Strict モード有効
- `skipLibCheck` での回避は禁止
- 暗黙の any、null チェック、未使用変数の検出を有効化

### 命名規則

- プロジェクトの既存パターンに従う
- 変数名・関数名: キャメルケース
- 型名・インターフェース名: パスカルケース

## セキュリティ / 機密情報

### 認証情報のコミット禁止

以下の情報は、設定ファイル（`CONFIG_PATH` 環境変数で指定）で管理し、Git にコミットしない:

- MoneyForward のメールアドレス・パスワード
- プロキシの認証情報
- その他の機密情報

### ログへの機密情報出力禁止

- 個人情報（メールアドレス、氏名など）
- 認証情報（パスワード、トークンなど）
- その他のセンシティブな情報

## リポジトリ固有

### アーキテクチャ

- **シングルファイル設計**: すべてのロジックは `src/main.ts` に集約
- **モノリシック構造**: ネストされたモジュール構造なし

### 設定ファイル

`CONFIG_PATH` 環境変数で指定する JSON 形式:

```jsonc
{
  "moneyforward": {
    "base_url": "https://moneyforward.com",  // オプション
    "mail_address": "your-email@example.com",  // 必須
    "password": "your-password"  // 必須
  },
  "proxy": {  // オプション
    "server": "http://proxy.example.com:8080",
    "username": "proxy-user",  // オプション
    "password": "proxy-password"  // オプション
  },
  "puppeteer": {}  // オプション（追加の Puppeteer オプション）
}
```

### 出力ディレクトリ（自動作成）

- `/data/csv/`: CSV エクスポート
- `/data/tsv/`: TSV エクスポート
- `/data/screenshot/`: PNG スクリーンショット
- `/data/html/`: HTML スナップショット

### 集約ファイル

- `/data/all.csv`: すべての収集期間から集約した CSV
- `/data/all.tsv`: すべての収集期間から集約した TSV

### Docker 実行

- **ベースイメージ**: zenika/alpine-chrome:with-puppeteer-xvfb
- **自動再実行**: entrypoint.sh により 1 時間ごとに実行
- **環境変数**:
  - `TZ`: Asia/Tokyo
  - `NODE_ENV`: production
  - `CONFIG_PATH`: /data/config.json
  - `CHROMIUM_PATH`: /usr/bin/chromium-browser
  - `LOG_DIR`: /data/logs/
  - `USER_DATA_BASE`: /data/userdata

### パッケージマネージャー制約

- **pnpm** が必須（preinstall フックで強制）
- npm や yarn は使用不可
- pnpm v10.28.1 または互換バージョンのみ許可

### Renovate

- 自動依存関係更新が有効（`renovate.json`）
- Renovate が作成した PR に対して、追加コミットや更新を行わないこと

### テスト

- このプロジェクトにはテストフレームワークは含まれていない
- 動作確認は実際の MoneyForward 環境での手動テストで行う
