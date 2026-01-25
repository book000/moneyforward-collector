# Claude Code 作業方針

## 目的

このドキュメントは、Claude Code がこのプロジェクトで作業する際の方針とプロジェクト固有ルールを定義します。

## 判断記録のルール

判断は必ずレビュー可能な形で記録すること:

1. **判断内容の要約**: 何を決定したかを明確に記載
2. **検討した代替案**: 考慮した他の選択肢を列挙
3. **採用しなかった案とその理由**: なぜその案を選ばなかったかを明示
4. **前提条件・仮定・不確実性**: 判断の前提となる条件や仮定を明示
5. **他エージェントによるレビュー可否**: 他のエージェントがレビューできるかを示す

**重要**: 前提・仮定・不確実性を明示すること。仮定を事実のように扱ってはならない。

## プロジェクト概要

- **目的**: MoneyForward の入出金明細を自動収集し、CSV/TSV/HTML/PNG 形式でエクスポートする
- **主な機能**:
  - MoneyForward への自動ログイン（Puppeteer による）
  - カレンダービューからの取引データ収集
  - 複数形式でのエクスポート（CSV、TSV、HTML、PNG）
  - 複数期間のデータを統合した集約ファイル生成
  - Docker コンテナでの定期実行（1 時間ごと）

## 重要ルール

- **会話言語**: 日本語
- **コード内コメント**: 日本語
- **エラーメッセージ**: 英語
- **日本語と英数字の間**: 半角スペースを挿入
- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語で記載
  - 例: `feat: CSV エクスポート機能を追加`

## 環境のルール

- **ブランチ命名**: [Conventional Branch](https://conventional-branch.github.io) に従う
  - 形式: `<type>/<description>`
  - `<type>` は短縮形（feat, fix, docs など）を使用
  - 例: `feat/add-user-auth`
- **GitHub リポジトリ調査**: テンポラリディレクトリに git clone して、そこでコード検索すること
- **環境**: Git Bash で動作（Windows 環境）
  - bash コマンドを使用
  - PowerShell コマンドを使用する場合は、明示的に `powershell -Command ...` か `pwsh -Command ...` を使用
- **Renovate PR**: Renovate が作成した既存のプルリクエストに対して、追加コミットや更新を行ってはならない

## Git Worktree について

このプロジェクトでは Git Worktree は使用していません。通常の Git ブランチ運用を行ってください。

## コード改修時のルール

- **日本語と英数字の間**: 半角スペースを挿入すること
- **エラーメッセージの絵文字**: 既存のエラーメッセージで先頭に絵文字がある場合は、全体でエラーメッセージに絵文字を設定すること。絵文字はエラーメッセージに即した一文字の絵文字である必要がある
- **TypeScript の skipLibCheck**: `skipLibCheck` を有効にして回避することは絶対にしてはならない
- **docstring**: 関数やインターフェースには、docstring（JSDoc など）を日本語で記載・更新すること

## 相談ルール

Codex CLI や Gemini CLI の他エージェントに相談することができます。以下の観点で使い分けてください。

### Codex CLI (ask-codex)

以下の場合に使用:

- 実装コードに対するソースコードレビュー
- 関数設計、モジュール内部の実装方針などの局所的な技術判断
- アーキテクチャ、モジュール間契約、パフォーマンス/セキュリティといった全体影響の判断
- 実装の正当性確認、機械的ミスの検出、既存コードとの整合性確認

### Gemini CLI (ask-gemini)

以下の場合に使用:

- SaaS 仕様、言語・ランタイムのバージョン差、料金・制限・クォータといった、最新の適切な情報が必要な外部依存の判断
- 外部一次情報の確認、最新仕様の調査、外部前提条件の検証

### 指摘への対応ルール

他エージェントが指摘・異議を提示した場合、Claude Code は必ず以下のいずれかを行う。**黙殺・無言での不採用は禁止する**。

- 指摘を受け入れ、判断を修正する
- 指摘を退け、その理由を明示する

以下は必ず実施してください。

- 他エージェントの提案を鵜呑みにせず、その根拠や理由を理解する
- 自身の分析結果と他エージェントの意見が異なる場合は、双方の視点を比較検討する
- 最終的な判断は、両者の意見を総合的に評価した上で、自身で下す

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

## アーキテクチャと主要ファイル

### アーキテクチャサマリー

- **シングルファイル設計**: すべてのロジックは `src/main.ts` に集約（367 行）
- **モノリシック構造**: ネストされたモジュール構造なし
- **Docker コンテナ化**: zenika/alpine-chrome ベースで実行
- **定期実行**: entrypoint.sh により 1 時間ごとに自動再実行

### 主要ディレクトリ

```
moneyforward-collector/
├── src/                          # ソースコードディレクトリ
│   └── main.ts                   # 単一エントリーポイント（全ロジック）
├── .github/
│   └── workflows/                # GitHub Actions CI/CD
│       ├── nodejs-ci-pnpm.yml   # Node.js lint/test ワークフロー
│       └── docker.yml            # Docker ビルド・公開ワークフロー
├── .vscode/                      # VS Code 設定
├── .devcontainer/                # Dev Container 設定
├── dist/                         # コンパイル済み JavaScript 出力（生成）
└── [設定ファイル]
```

### 主要ファイル

| ファイル | 目的 |
|---------|------|
| `src/main.ts` | すべてのアプリケーションロジックを含む単一ソースファイル（367 行） |
| `package.json` | プロジェクトメタデータ、スクリプト、依存関係 |
| `tsconfig.json` | TypeScript コンパイラ設定 |
| `eslint.config.mjs` | ESLint 設定（@book000/eslint-config 継承） |
| `.prettierrc.yml` | Prettier コードフォーマットルール |
| `Dockerfile` | マルチステージ Docker イメージ定義 |
| `compose.yaml` | Docker Compose 設定（ローカル開発用） |
| `entrypoint.sh` | Docker エントリースクリプト（1 時間ごと再実行） |

## 実装パターン

### 推奨パターン

- **設定管理**: JSON 形式の設定ファイル（`CONFIG_PATH` 環境変数で指定）
- **ログ出力**: `@book000/node-utils` の Logger を使用
- **ブラウザ自動化**: Puppeteer Core を使用
- **エラーハンドリング**: try-catch でエラーを捕捉し、適切にログ出力
- **ファイル出力**: 自動的にディレクトリを作成してから出力

### 非推奨パターン

- **複数ファイルへの分割**: 現在はシングルファイル設計を採用しているため、分割は行わない
- **skipLibCheck の使用**: 型エラーを回避する目的での使用は禁止
- **console.log の使用**: Logger を使用すること

## テスト

### テスト方針

- このプロジェクトにはテストフレームワークは含まれていない
- データ収集ユーティリティのため、ユニットテストや統合テストは未実装
- 動作確認は実際の MoneyForward 環境での手動テストで行う

### テスト追加条件

新しいロジックを追加する場合でも、現時点ではテストフレームワークの導入は不要。手動テストで確認すること。

## ドキュメント更新ルール

### 更新対象

以下のドキュメントを更新する場合は、同時に更新すること:

- `README.md`: プロジェクト概要、使用方法、設定方法
- `package.json`: 依存関係、スクリプト、バージョン情報
- `.github/copilot-instructions.md`: GitHub Copilot 向けプロンプトファイル
- `CLAUDE.md`（このファイル）: Claude Code 向けプロンプトファイル
- `AGENTS.md`: 一般的な AI エージェント向けプロンプトファイル
- `GEMINI.md`: Gemini CLI 向けプロンプトファイル

### 更新タイミング

- 新機能追加時
- 技術スタック変更時
- 開発コマンド変更時
- プロジェクト要件変更時

## 作業チェックリスト

### 新規改修時

新規改修を行う前に、以下を必ず確認すること:

1. プロジェクトについて詳細に探索し理解すること
2. 作業を行うブランチが適切であること。すでに PR を提出しクローズされたブランチでないこと
3. 最新のリモートブランチに基づいた新規ブランチであること
4. PR がクローズされ、不要となったブランチは削除されていること
5. プロジェクトで指定されたパッケージマネージャにより、依存パッケージをインストールしたこと

### コミット・プッシュする前

コミット・プッシュする前に、以下を必ず確認すること:

1. コミットメッセージが Conventional Commits に従っていること。ただし、`<description>` は日本語で記載する
2. コミット内容にセンシティブな情報が含まれていないこと
3. Lint / Format エラーが発生しないこと
   - `pnpm lint` を実行してエラーがないことを確認
4. 動作確認を行い、期待通り動作すること

### プルリクエストを作成する前

プルリクエストを作成する前に、以下を必ず確認すること:

1. プルリクエストの作成をユーザーから依頼されていること
2. コミット内容にセンシティブな情報が含まれていないこと
3. コンフリクトする恐れが無いこと

### プルリクエストを作成した後

プルリクエストを作成した後は、以下を必ず実施すること。PR 作成後のプッシュ時に毎回実施する。時間がかかる処理が多いため、Task を使って並列実行すること。

1. コンフリクトが発生していないこと
2. PR 本文の内容は、ブランチの現在の状態を、今までのこの PR での更新履歴を含むことなく、最新の状態のみ、漏れなく日本語で記載されていること。この PR を見たユーザーが、最終的にどのような変更を含む PR なのかをわかりやすく、細かく記載されていること
3. `gh pr checks <PR ID> --watch` で GitHub Actions CI を待ち、その結果がエラーとなっていないこと。成功している場合でも、ログを確認し、誤って成功扱いになっていないこと。もし GitHub Actions が動作しない場合は、ローカルで CI と同等のテストを行い、CI が成功することを保証すること
4. `request-review-copilot` コマンドが存在する場合、`request-review-copilot https://github.com/$OWNER/$REPO/pull/$PR_NUMBER` で GitHub Copilot へレビューを依頼すること。レビュー依頼は自動で行われる場合もあるし、制約により `request-review-copilot` を実行しても GitHub Copilot がレビューしないケースがある
5. 10 分以内に投稿される GitHub Copilot レビューへの対応を行うこと。対応したら、レビューコメントそれぞれに対して返信を行うこと。レビュアーに GitHub Copilot がアサインされていない場合はスキップして構わない
6. `/code-review:code-review` によるコードレビューを実施したこと。コードレビュー内容に対しては、スコアが 50 以上の指摘事項に対して対応すること

## リポジトリ固有

### 設定ファイル

`CONFIG_PATH` 環境変数で指定する JSON 形式の設定ファイル:

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

### データファイル

- `/data/all.csv`: すべての収集期間から集約した CSV
- `/data/all.tsv`: すべての収集期間から集約した TSV

### コンテナベースイメージ

- `zenika/alpine-chrome:with-puppeteer-xvfb`: Chromium と XVFB を含む Alpine Linux

### 自動再実行動作

- entrypoint.sh により、アプリケーションを 1 時間ごとに実行
- 定期的なデータ収集を実現
- エラー時も継続（`|| true`）

### Node バージョン管理

- `.node-version` ファイルを使用（nvm/fnm 互換）
- 現在: Node.js 24.13.0

### 依存関係管理の制約

- **pnpm** が必須（preinstall フックで強制）
- npm や yarn は使用不可
- pnpm v10.28.1 または互換バージョンのみ許可

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
