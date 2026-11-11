# AGENTS.md

AI コーディングエージェントとコントリビューター向けの指針です。`CLAUDE.md` はこのファイルを取り込み、`.github/copilot-instructions.md` はレビュー観点を補足します。

## Language

- 成果物は**日本語**で書く。コミットメッセージの description、PR / Issue のタイトルと本文、レビューコメント、コード内コメントと docstring、ドキュメント（`README.md`、`AGENTS.md` など）が対象。
- 日本語と英数字の間には半角スペースを入れる。
- 例外（そのまま残す）: 引用、技術的な識別子、生成ファイル、外部由来のテキスト。MoneyForward の画面と出力ファイルに由来する日本語（集約ファイルのヘッダ `日付`、`内容`、`金額`、`保有金融機関`、`メモ` など）は仕様の一部なので変更しない。`package.json` の記述は英語。`.github/copilot-instructions.md` は GitHub Copilot 向けの短いチェックリストで、英語で書く。
- 実行時メッセージ（ログ、エラー）は英語。
- 過去のコミットの言語を変えるために Git 履歴を書き換えない。

## Overview

MoneyForward の入出金明細を Puppeteer で収集し、CSV、TSV、スクリーンショット（PNG）、HTML として保存する TypeScript 製ツール。収集後に全期間分を集約した `all.csv` と `all.tsv` も生成する。Docker コンテナでは `entrypoint.sh` が 1 時間ごとに再実行する。

## Commands

```bash
pnpm install       # 依存関係のインストール（preinstall の only-allow で pnpm 以外は拒否される）
pnpm start         # tsx で src/main.ts を実行
pnpm dev           # tsx watch で src/main.ts を実行
pnpm test          # tsx --test による node:test のテスト（src/csv.test.ts）
pnpm lint          # prettier --check、eslint、tsc を実行
pnpm fix           # prettier --write と eslint --fix を実行
```

コミット前に `pnpm lint` と `pnpm test` を実行する。Node.js と pnpm のバージョンは `.node-version` と `package.json` の `packageManager` で固定している。

## Structure

- `src/main.ts`: アプリケーションロジックを集約した単一のエントリーポイント。ログイン、期間ごとの収集と保存、集約ファイルの生成を行う。
- `src/csv.ts`: CSV / TSV のシリアライズとパース。副作用がなくテストできるように分離している。旧形式（ダブルクォート未エスケープ）のファイルは旧パーサへフォールバックする。
- `src/csv.test.ts`: `src/csv.ts` のテスト。
- `Dockerfile`、`compose.yaml`、`entrypoint.sh`: コンテナでの定期実行用。
- `.github/workflows/`: Node CI（`nodejs-ci-pnpm.yml`）と Docker イメージのビルド（`docker.yml`）。どちらも `book000/templates` の再利用ワークフローを呼び出す。

ロジックを `src/main.ts` に集約する方針なので、テストのためなどの理由なく分割しない。

## Conventions

- TypeScript、pnpm、ESLint（`@book000/eslint-config`）、Prettier を使う。
- ログは `@book000/node-utils` の `Logger` で出力し、`console.log` は使わない。
- `tsconfig.json` で `skipLibCheck` を有効にして型エラーを回避しない。
- 関数とインターフェースには JSDoc を書く。
- 設定は `CONFIG_PATH` 環境変数で指定する JSON ファイルで管理する。認証情報やプロキシ情報をコード、ログ、コミットへ含めない。
- テストは CSV / TSV の入出力（`src/csv.ts`）だけが対象。入出力形式を変更するときは `src/csv.test.ts` にテストを追加する。ブラウザ操作は実環境で手動確認する。
- `entrypoint.sh` の `pnpm start || true` は、失敗しても定期実行を続けるための意図的な設計。
- コミットは [Conventional Commits](https://www.conventionalcommits.org/)、ブランチは [Conventional Branch](https://conventional-branch.github.io)（`feat/...`、`fix/...`）に従う。
- Renovate が作成した PR にコミットしない。
- 実際の MoneyForward アカウントの認証情報や取引データを、コード、テスト、ドキュメント、PR に含めない。

## Docs

コマンド、設定項目、環境変数、出力形式を変更したときは、`README.md` とこのファイルを合わせて更新する。
