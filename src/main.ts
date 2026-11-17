import fs from 'node:fs'
import puppeteer, { LaunchOptions, Page } from 'puppeteer-core'
import { ErrorReporter, Logger } from '@book000/node-utils'
import { dropOverlappedRows, PeriodRows } from './aggregate'
import { Delimiter, parseRows, serializeRows } from './csv'
import { isPeriodChanged, judgeAfterTimeout } from './period'

/**
 * `CONFIG_PATH` で指定する JSON 設定ファイルの形式。
 */
interface Config {
  moneyforward: {
    base_url?: string
    mail_address: string
    password: string
  }
  proxy?: {
    server: string
    username?: string
    password?: string
  }
  puppeteer?: Record<string, unknown>
}

/**
 * MoneyForward にログインする。
 * 固定待機を挟みながらフォームへ入力して送信する。
 *
 * @param config 設定
 * @param page ページ
 */
async function login(config: Config, page: Page) {
  const logger = Logger.configure('login')
  logger.info('login()')
  const url = config.moneyforward.base_url
  await page.goto(`${url}/users/sign_in`)
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const mailAddress = config.moneyforward.mail_address
  const password = config.moneyforward.password

  await page
    .waitForSelector('#sign_in_session_service_email', {
      visible: true,
    })
    .then((element) => element?.type(mailAddress))
  await page
    .waitForSelector('#sign_in_session_service_password', {
      visible: true,
    })
    .then((element) => element?.type(password))
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await page
    .waitForSelector('#login-btn-sumit', {
      visible: true,
    })
    .then((element) => element?.click())
  await new Promise((resolve) => setTimeout(resolve, 3000))
}

/**
 * 取引明細テーブルの各セルのテキストを行ごとに取得する。
 * セル内の改行は、1 レコード 1 行を保つため `\n`（バックスラッシュと n）へ置換する。
 *
 * @param page ページ
 * @returns 行データ。テーブルが存在しない場合は null
 */
async function getTableRows(page: Page) {
  const table = await page.$('table#cf-detail-table')
  if (!table) {
    return null
  }
  const result: string[][] = []
  const rows = await table.$$('tr')
  for (const row of rows) {
    const cells = await row.$$('th, td')
    const values: string[] = []
    for (const cell of cells) {
      const textContent =
        (await cell.evaluate((element) => element.textContent)) || ''
      values.push(textContent.replaceAll('\n', String.raw`\n`))
    }
    result.push(values)
  }
  return result
}

/**
 * 取引明細テーブルを CSV 文字列へ変換する。
 *
 * @param page ページ
 * @returns CSV 文字列。テーブルが存在しない場合は null
 */
async function toCSV(page: Page) {
  const logger = Logger.configure('toCSV')
  logger.info('toCSV()')
  const rows = await getTableRows(page)
  return rows ? serializeRows(rows, ',') : null
}

/**
 * 取引明細テーブルを TSV 文字列へ変換する。
 *
 * @param page ページ
 * @returns TSV 文字列。テーブルが存在しない場合は null
 */
async function toTSV(page: Page) {
  const logger = Logger.configure('toTSV')
  logger.info('toTSV()')
  const rows = await getTableRows(page)
  return rows ? serializeRows(rows, '\t') : null
}

/**
 * 表示中の期間の取引明細を CSV、TSV、スクリーンショット、HTML として `/data` 配下へ保存する。
 * ファイル名は `YYYYMMDD - YYYYMMDD`（表示期間の開始日と終了日）。
 *
 * @param config 設定
 * @param page ページ
 */
async function save(config: Config, page: Page) {
  const logger = Logger.configure('save')
  logger.info('save()')
  const dateText = await page.$eval(
    '.fc-header-title h2',
    (element) => element.textContent
  )
  if (!dateText) {
    return
  }
  const dates = dateText.split(' - ')
  const startDate = new Date(dates[0])
  logger.info(`startDate: ${startDate.toString()}`)
  const endDate = new Date(dates[1])
  logger.info(`endDate: ${endDate.toString()}`)
  const filename = `${startDate.getFullYear()}${(startDate.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${startDate
    .getDate()
    .toString()
    .padStart(2, '0')} - ${endDate.getFullYear()}${(endDate.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${endDate.getDate().toString().padStart(2, '0')}`
  const csv = await toCSV(page)
  if (csv) {
    fs.writeFileSync(`/data/csv/${filename}.csv`, csv)
  }
  const tsv = await toTSV(page)
  if (tsv) {
    fs.writeFileSync(`/data/tsv/${filename}.tsv`, tsv)
  }
  await page.screenshot({
    path: `/data/screenshot/${filename}.png`,
    fullPage: true,
  })
  let html = await page.$eval('html', (element) => element.innerHTML)
  const url = config.moneyforward.base_url
  html = html.replaceAll('href="/', () => `href="${url}/`)
  html = html.replaceAll('src="/', () => `src="${url}`)
  fs.writeFileSync(`/data/html/${filename}.html`, html)
}

/** 前の期間へ移動した後、期間の見出しが切り替わるのを待つ上限（ミリ秒）。 */
const PERIOD_CHANGE_TIMEOUT_MS = 30_000

/**
 * 前の期間ボタンが無効（最古の期間を表示中）かを返す。
 *
 * @param page ページ
 * @returns 無効なら true
 */
async function isPreviousButtonDisabled(page: Page) {
  return page.$eval(
    'button.fc-button-prev',
    (element) =>
      element.disabled ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.classList.contains('fc-state-disabled')
  )
}

/**
 * 期間の見出しを読み取る。
 *
 * @param page ページ
 * @returns 見出しのテキスト。取得できなければ null
 */
async function readHeading(page: Page) {
  return page.$eval('.fc-header-title h2', (element) => element.textContent)
}

/**
 * 期間の見出しが `before` から次の期間へ切り替わるのを、タイムアウトまで待つ。
 *
 * @param page ページ
 * @param before 前の期間へ移動する前の見出し
 * @returns 切り替わったら true、{@link PERIOD_CHANGE_TIMEOUT_MS} 以内に切り替わらなければ false
 */
async function waitForPeriodChange(page: Page, before: string | null) {
  const deadline = Date.now() + PERIOD_CHANGE_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (isPeriodChanged(before, await readHeading(page))) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

/**
 * 家計簿の画面を開き、最古の期間に到達するまで前の期間へ遡りながら各期間を保存する。
 * 前の期間ボタンが無効になるか、ボタンが有効なまま見出しが切り替わらなければ、最古の期間として正常終了する。
 * 見出しが `Loading...` のままなど、最古の期間と判断できない場合は、収集失敗として例外を投げる。
 *
 * @param config 設定
 * @param page ページ
 * @throws {@link PERIOD_CHANGE_TIMEOUT_MS} 以内に見出しが切り替わらず、最古の期間とも判断できなかった場合
 */
async function cf(config: Config, page: Page) {
  const logger = Logger.configure('cf')
  logger.info('cf()')
  const url = config.moneyforward.base_url
  await page.goto(`${url}/cf`)
  await new Promise((resolve) => setTimeout(resolve, 3000))

  while (true) {
    const before = await page.$eval(
      '.fc-header-title h2',
      (element) => element.textContent
    )
    logger.info(`before: ${before}`)

    await save(config, page)

    await new Promise((resolve) => setTimeout(resolve, 5000))
    const previousElement = await page.$('button.fc-button-prev')
    await previousElement?.evaluate((element) => {
      element.scrollIntoView()
    })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    if (await isPreviousButtonDisabled(page)) {
      logger.info('Previous period button is disabled. Reached the oldest.')
      break
    }
    await page
      .waitForSelector('button.fc-button-prev', {
        visible: true,
      })
      .then((element) => element?.click())
    if (!(await waitForPeriodChange(page, before))) {
      if (await isPreviousButtonDisabled(page)) {
        logger.info('Previous period button is disabled. Reached the oldest.')
        break
      }
      const current = await readHeading(page)
      const result = judgeAfterTimeout(before, current)
      if (result === 'oldest') {
        logger.info(
          `Heading did not change within ${PERIOD_CHANGE_TIMEOUT_MS} ms: ${before}. Reached the oldest.`
        )
        break
      }
      if (result !== 'changed') {
        throw new Error(
          `Heading did not change to a new period within ${PERIOD_CHANGE_TIMEOUT_MS} ms (before: "${before}", current: "${current}", result: ${result})`
        )
      }
    }
    logger.info(`Heading changed from: ${before}`)
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

/**
 * 明細の月日に年を補う。
 * ファイル名の日付が 12 月で明細が 1 月の場合のみ、翌年とみなす。
 * 例: filedate が 20201210 で monthDay が 01/01(金) なら 2021、filedate が 20210210 なら monthDay に関わらず 2021。
 *
 * @param filedate ファイル名の先頭の日付（YYYYMMDD）
 * @param monthDay 明細の月日（MM/DD(曜日)）
 * @returns 年（4 桁の文字列）
 */
function getYear(filedate: string, monthDay: string) {
  const year = filedate.slice(0, 4)

  return filedate.slice(4, 6) === '12' && monthDay.startsWith('01')
    ? String(Number(year) + 1)
    : year
}

/**
 * 収集済みの CSV/TSV ファイルを集約して、1 つのファイルに保存する。
 *
 * @param directory 収集済みファイルのディレクトリ
 * @param extension 対象ファイルの拡張子（ドット付き）
 * @param delimiter 区切り文字
 * @param outputPath 集約ファイルの出力先
 */
function saveAll(
  directory: string,
  extension: string,
  delimiter: Delimiter,
  outputPath: string
) {
  const logger = Logger.configure('saveAll')

  // 既存の列位置を保つため、大項目と中項目は末尾に置く
  const columns: [number, string][] = [
    [1, '日付'],
    [2, '内容'],
    [3, '金額'],
    [4, '保有金融機関'],
    [7, 'メモ'],
    [5, '大項目'],
    [6, '中項目'],
  ]

  const files = fs.readdirSync(directory)
  const headers = columns.map(([, name]) => name).join(delimiter)

  const periods: PeriodRows[] = []
  for (const file of files) {
    const period = /^(\d{8}) - (\d{8})/.exec(file)
    if (!file.endsWith(extension)) {
      continue
    }
    if (!period) {
      logger.warn(`Skip ${file}: file name is not "YYYYMMDD - YYYYMMDD"`)
      continue
    }
    const [, start, end] = period

    const content = fs.readFileSync(`${directory}/${file}`, 'utf8')
    // 先頭行はヘッダ行のため除外する
    const rows = parseRows(content, delimiter, (reason) => {
      logger.warn(
        `Failed to parse ${file} strictly. Fall back to the legacy parser: ${reason}`
      )
    }).slice(1)
    const fileRows = rows
      .map((row) => columns.map(([index]) => row[index] ?? ''))
      .map((row) => {
        const date = row[0].split('(', 1)[0]
        const year = getYear(start, date)
        const [month, day] = date.split('/', 2)
        return [`${year}/${month}/${day}`, ...row.slice(1)]
      })
      .toReversed()

    periods.push({ start, end, rows: fileRows })
  }

  const allRows = dropOverlappedRows(periods)
  const loadedCount = periods.reduce((sum, p) => sum + p.rows.length, 0)
  logger.info(`Loaded rows: ${loadedCount}, kept rows: ${allRows.length}`)

  fs.writeFileSync(
    outputPath,
    `${headers}\n${serializeRows(allRows, delimiter)}`
  )
}

/** 収集済みの CSV を集約して `/data/all.csv` へ保存する。 */
function saveAllCsv() {
  const logger = Logger.configure('saveAllCsv')
  logger.info('saveAllCsv()')
  saveAll('/data/csv/', '.csv', ',', '/data/all.csv')
}

/** 収集済みの TSV を集約して `/data/all.tsv` へ保存する。 */
function saveAllTsv() {
  const logger = Logger.configure('saveAllTsv')
  logger.info('saveAllTsv()')
  saveAll('/data/tsv/', '.tsv', '\t', '/data/all.tsv')
}

/** 出力先ディレクトリが存在しなければ作成する。 */
function mkdirs() {
  const directories = [
    '/data/csv',
    '/data/tsv',
    '/data/screenshot',
    '/data/html',
  ]
  for (const directory of directories) {
    if (fs.existsSync(directory)) {
      continue
    }

    fs.mkdirSync(directory)
  }
}

/**
 * 設定を読み込み、ログインから収集、集約ファイルの保存までを実行する。
 * 設定ファイルのパスは環境変数 `CONFIG_PATH`（未設定時は `config.json`）で指定する。
 */
async function main() {
  const logger = Logger.configure('main')
  logger.info('main()')
  const configPath = process.env.CONFIG_PATH ?? 'config.json'
  const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  config.moneyforward.base_url ??= 'https://moneyforward.com'

  mkdirs()

  const puppeteerOptions: LaunchOptions = {
    headless: true,
    slowMo: 100,
    executablePath: '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
    ...config.puppeteer,
  }

  if (config.proxy?.server) {
    puppeteerOptions.args?.push('--proxy-server=' + config.proxy.server)
  }

  const browser = await puppeteer.launch(puppeteerOptions)
  const page = await browser.newPage()
  await page.setUserAgent({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0',
  })
  if (config.proxy?.username && config.proxy.password) {
    logger.info('Login proxy')
    await page.authenticate({
      username: config.proxy.username,
      password: config.proxy.password,
    })
    logger.info('Login proxy... done')
  }

  await login(config, page)
  await cf(config, page)

  await browser.close()

  saveAllCsv()
  saveAllTsv()
}

;(async () => {
  const logger = Logger.configure('main')
  try {
    await main()
  } catch (error) {
    logger.error('main() error', error as Error)
    // SENTRY_DSN が設定されている場合、GlitchTip へタグ付きでエラーを送信する
    ErrorReporter.captureException(error as Error, { phase: 'main' })
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  }
})()
