# moneyforward-collector

MoneyForward の入出金明細を Puppeteer で自動収集し、CSV、TSV、スクリーンショット（PNG）、HTML として保存するツールです。収集後に、全期間分を集約した `all.csv` と `all.tsv` も生成します。

## 動作の概要

1. 設定ファイルの認証情報で MoneyForward にログインする。
2. 家計簿（`/cf`）の画面を開き、表示期間が変わらなくなるまで前の期間へ遡りながら、期間ごとに明細を保存する。
3. 保存済みの CSV と TSV を集約して `all.csv` と `all.tsv` を作る。

Docker コンテナでは、`entrypoint.sh` が上記の処理を 1 時間ごとに繰り返します。失敗しても次の周期で再実行します。

## 必要なもの

- Docker（推奨）。ブラウザ自動化に Chromium を使うため、`Dockerfile` は `zenika/alpine-chrome:with-puppeteer-xvfb` をベースにしている。
- Docker を使わず直接実行する場合は、Node.js（バージョンは `.node-version` を参照）、pnpm、`/usr/bin/chromium-browser` にある Chromium、書き込み可能な `/data` ディレクトリが必要。

## セットアップと実行

### 設定ファイル

`data/config.json` を作成します（`data/` は Git の管理対象外です）。

```json
{
  "moneyforward": {
    "base_url": "https://moneyforward.com",
    "mail_address": "<MoneyForward のメールアドレス>",
    "password": "<MoneyForward のパスワード>"
  },
  "proxy": {
    "server": "<プロキシサーバー URL>",
    "username": "<プロキシ認証のユーザー名>",
    "password": "<プロキシ認証のパスワード>"
  },
  "puppeteer": {}
}
```

| 項目 | 必須 | 説明 |
| --- | --- | --- |
| `moneyforward.mail_address` | はい | ログインに使うメールアドレス |
| `moneyforward.password` | はい | ログインに使うパスワード |
| `moneyforward.base_url` | いいえ | MoneyForward の URL。省略時は `https://moneyforward.com` |
| `proxy.server` | いいえ | 指定すると Chromium の `--proxy-server` に渡す |
| `proxy.username`、`proxy.password` | いいえ | 両方を指定したときだけプロキシ認証に使う |
| `puppeteer` | いいえ | Puppeteer の起動オプション。既定のオプションを上書きする |

設定ファイルには認証情報が含まれるため、コミットしないでください。

### Docker Compose で実行する

```bash
docker compose up --build
```

`compose.yaml` は、リポジトリ直下の `./data` をコンテナの `/data` にマウントします。設定ファイルは `/data/config.json`（`CONFIG_PATH`）から読み込まれ、出力もすべて `./data` 配下に保存されます。

### 環境変数

`Dockerfile` が設定する環境変数のうち、アプリケーションのコードが直接参照するのは `CONFIG_PATH` です（未設定時は実行ディレクトリの `config.json`）。

| 変数 | 説明 |
| --- | --- |
| `CONFIG_PATH` | 設定ファイルのパス。`Dockerfile` では `/data/config.json` |
| `LOG_DIR` | `@book000/node-utils` のログ出力先。`Dockerfile` では `/data/logs/` |
| `SENTRY_DSN` | 設定すると、エラーが GlitchTip（Sentry 互換）へ送信される。未設定なら送信しない |

`SENTRY_DSN` と一緒に、`@book000/node-utils` が読むオプションの環境変数（`SENTRY_ENVIRONMENT`、`SENTRY_LOG_LEVEL`）も使えます。

### ローカルで直接実行する

```bash
pnpm install
pnpm start   # 1 回だけ収集する
pnpm dev     # ファイル変更を監視して再実行する
```

出力先は `/data` 固定です（環境変数では変更できません）。

## 出力

出力先はすべて `/data` 配下です。ディレクトリは自動で作成されます。

| パス | 内容 |
| --- | --- |
| `/data/csv/<期間>.csv` | 期間ごとの明細（CSV） |
| `/data/tsv/<期間>.tsv` | 期間ごとの明細（TSV） |
| `/data/screenshot/<期間>.png` | 期間ごとの画面全体のスクリーンショット |
| `/data/html/<期間>.html` | 期間ごとの HTML。`href="/` と `src="/` は、先頭の `/` を取り除いて `base_url` を前置する形で置換される（`base_url` に末尾の `/` がないと、`https://moneyforward.comcf` のように区切りのない URL になる既知の問題がある） |
| `/data/all.csv` | 全期間を集約した CSV |
| `/data/all.tsv` | 全期間を集約した TSV |

`<期間>` は、画面に表示された期間の開始日と終了日を使った `YYYYMMDD - YYYYMMDD` 形式です。

`all.csv` と `all.tsv` は、各期間のファイルから `日付`、`内容`、`金額`、`保有金融機関`、`メモ`、`大項目`、`中項目` の 7 列を取り出し、日付に年を補ったものです。

期間が重なるファイルに同じ取引が含まれるため、日付ごとに、その日付を含む最新の期間ファイル（ファイル名の開始日が大きいもの）の行だけを採用して重複を除きます。同じ期間ファイル内に同一日・同内容・同金額の取引が複数ある場合は、その件数を保ちます。

## 開発

```bash
pnpm lint   # prettier、eslint、tsc
pnpm fix    # prettier と eslint の自動修正
pnpm test   # CSV / TSV のシリアライズとパース、集約時の重複除去のテスト
```

開発時の指針は [AGENTS.md](AGENTS.md) を参照してください。

## ライセンス

MIT（`package.json` の `license` フィールドによる）
