import fs from 'node:fs'
import puppeteer, {
  BrowserConnectOptions,
  BrowserLaunchArgumentOptions,
  LaunchOptions,
  Page,
  Product,
} from 'puppeteer-core'
import { Logger } from '@book000/node-utils'

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

async function cf(config: Config, page: Page) {
  const logger = Logger.configure('cf')
  logger.info('cf()')
  const url = config.moneyforward.base_url
  await page.goto(`${url}/cf`)
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const before = await page.$eval(
      '.fc-header-title h2',
      (element) => element.textContent
    )
    logger.info(`before: ${before}`)

    await save(config, page)

    await new Promise((resolve) => setTimeout(resolve, 5000))
    await page.evaluate(() => {
      const previousElement = document.querySelector(`button.fc-button-prev`)
      if (previousElement != null) {
        previousElement.scrollIntoView()
      }
    })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await page
      .waitForSelector('button.fc-button-prev', {
        visible: true,
      })
      .then((element) => element?.click())
    await new Promise((resolve) => setTimeout(resolve, 5000))
    const after = await page.$eval(
      '.fc-header-title h2',
      (element) => element.textContent // ?
    )
    logger.info(`after: ${after}`)
    if (before === after) {
      logger.info(`before == after. break;`)
      break
    }
    logger.info(`before != after. next`)
  }
}

async function save(config: Config, page: Page) {
  const logger = Logger.configure('save')
  logger.info('save()')
  const dateText = await page.$eval(
    '.fc-header-title h2',
    (element) => element.textContent // ?
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
  let html = await page.evaluate(() => {
    return document.querySelectorAll('html')[0].innerHTML
  })
  const url = config.moneyforward.base_url
  html = html.replaceAll('href="/', `href="${url}`)
  html = html.replaceAll('src="/', `src="${url}`)
  fs.writeFileSync(`/data/html/${filename}.html`, html)
}

async function toCSV(page: Page) {
  const logger = Logger.configure('toCSV')
  logger.info('toCSV()')
  const table = await page.$('table#cf-detail-table')
  if (!table) {
    return null
  }
  let dataCsv = ''
  const rows = await table.$$('tr')
  for (const row of rows) {
    const cells = await row.$$('th, td')
    for (let index = 0; index < cells.length; index++) {
      const textContent = await cells[index].evaluate(
        (element) => element.textContent
      )
      dataCsv += `"${textContent?.replaceAll('\n', '\\n') ?? ''}"`
      dataCsv += index === cells.length - 1 ? '\n' : ','
    }
  }
  return dataCsv
}

async function toTSV(page: Page) {
  const logger = Logger.configure('toTSV')
  logger.info('toTSV()')
  const table = await page.$('table#cf-detail-table')
  if (!table) {
    return null
  }
  const rows = await table.$$('tr')
  let dataTsv = ''
  for (const row of rows) {
    const cells = await row.$$('th, td')
    for (let index = 0; index < cells.length; index++) {
      const cellText =
        (await cells[index].evaluate((element) => element.textContent)) ?? ''
      dataTsv += `"${cellText.replaceAll('\n', '\\n')}"`
      dataTsv += index === cells.length - 1 ? '\n' : '\t'
    }
  }

  return dataTsv
}

function getYear(filedate: string, monthDay: string) {
  // filedate: 20201210 monthDay: 01/01(金) -> 2021
  // filedate: 20210210 monthDay: 02/13(金) -> 2021

  const year = filedate.slice(0, 4)

  // filedateが12月で、monthDayが1月の場合、yearは1年進む
  if (filedate.slice(4, 6) === '12' && monthDay.startsWith('01')) {
    return String(Number(year) + 1)
  }

  return year
}

function saveAllCsv() {
  const logger = Logger.configure('saveAllCsv')
  logger.info('saveAllCsv()')

  const columns = {
    1: '日付',
    2: '内容',
    3: '金額',
    4: '保有金融機関',
    7: 'メモ',
  }

  const files = fs.readdirSync('/data/csv/')
  const csvFiles = files.filter(
    (file) => file.endsWith('.csv') && /^\d{8}/.test(file)
  )
  const headers = Object.values(columns).join(',')

  const allCsvs = []
  for (const file of csvFiles) {
    const tsv = fs.readFileSync(`/data/csv/${file}`, 'utf8')
    const rows = tsv.split('\n').slice(1)
    const filedate = file.split(' - ')[0] // 20210101
    const allCsv = rows
      .filter((row) => row.length > 0)
      .map((row) => row.split(',').map((col) => col.replace(/^"(.+)"$/, '$1')))
      .map((row) => row.filter((_, index) => index in columns))
      .map((row) => {
        const date = row[0].split('(')[0]
        const year = getYear(filedate, date)
        const month = date.split('/')[0]
        const day = date.split('/')[1]
        return [`${year}/${month}/${day}`, ...row.slice(1)]
      })
      .map((row) => row.map((col) => `"${col}"`))
      .map((row) => row.join(','))
      .reverse()
      .join('\n')

    allCsvs.push(allCsv)
  }

  fs.writeFileSync(
    `/data/all.csv`,
    `${headers}\n${allCsvs.filter((csv) => csv.length > 0).join('\n')}`
  )
}

function saveAllTsv() {
  const logger = Logger.configure('saveAllTsv')
  logger.info('saveAllTsv()')

  const columns = {
    1: '日付',
    2: '内容',
    3: '金額',
    4: '保有金融機関',
    7: 'メモ',
  }

  const files = fs.readdirSync('/data/tsv/')
  const tsvFiles = files.filter(
    (file) => file.endsWith('.tsv') && /^\d{8}/.test(file)
  )
  const headers = Object.values(columns).join('\t')

  const allTsvs = []
  for (const file of tsvFiles) {
    const tsv = fs.readFileSync(`/data/tsv/${file}`, 'utf8')
    const rows = tsv.split('\n').slice(1)
    const filedate = file.split(' - ')[0] // 20210101
    const allTsv = rows
      .filter((row) => row.length > 0)
      .map((row) => row.split('\t'))
      .map((row) => row.filter((_, index) => index in columns))
      .map((row) => {
        const date = row[0].split('(')[0]
        const year = getYear(filedate, date)
        const month = date.split('/')[0]
        const day = date.split('/')[1]
        return [`${year}/${month}/${day}`, ...row.slice(1)]
      })
      .map((row) => row.join('\t'))
      .reverse()
      .join('\n')

    allTsvs.push(allTsv)
  }

  fs.writeFileSync(
    `/data/all.tsv`,
    `${headers}\n${allTsvs.filter((tsv) => tsv.length > 0).join('\n')}`
  )
}

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

async function main() {
  const logger = Logger.configure('main')
  logger.info('main()')
  const configPath = process.env.CONFIG_PATH ?? 'config.json'
  const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  if (!config.moneyforward.base_url) {
    config.moneyforward.base_url = 'https://moneyforward.com'
  }

  mkdirs()

  const puppeteerOptions: LaunchOptions &
    BrowserLaunchArgumentOptions &
    BrowserConnectOptions & {
      product?: Product
      extraPrefsFirefox?: Record<string, unknown>
    } = {
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
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0'
  )
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
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  }
})()
