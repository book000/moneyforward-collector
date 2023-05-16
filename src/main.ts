import fs from 'fs'
import puppeteer, {
  BrowserConnectOptions,
  BrowserLaunchArgumentOptions,
  LaunchOptions,
  Page,
  Product,
} from 'puppeteer-core'

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
  puppeteer?: { [key: string]: unknown }
}

async function login(config: Config, page: Page) {
  console.log('login()')
  const url = config.moneyforward.base_url
  await page.goto(`${url}/users/sign_in`)
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const mailAddress = config.moneyforward.mail_address
  const password = config.moneyforward.password

  await page
    .waitForSelector('#sign_in_session_service_email', {
      visible: true,
    })
    .then((el) => el?.type(mailAddress))
  await page
    .waitForSelector('#sign_in_session_service_password', {
      visible: true,
    })
    .then((el) => el?.type(password))
  await new Promise((resolve) => setTimeout(resolve, 1000))
  await page
    .waitForSelector('#login-btn-sumit', {
      visible: true,
    })
    .then((el) => el?.click())
  await new Promise((resolve) => setTimeout(resolve, 3000))
}

async function cf(config: Config, page: Page) {
  console.log('cf()')
  const url = config.moneyforward.base_url
  await page.goto(`${url}/cf`)
  await page.waitForTimeout(3000)

  while (true) {
    const before = await page.$eval(
      '.fc-header-title h2',
      (el) => el.textContent
    )
    console.log(`before: ${before}`)

    await save(config, page)

    await new Promise((resolve) => setTimeout(resolve, 5000))
    await page.evaluate(() => {
      const prevElement = document.querySelector(`button.fc-button-prev`)
      if (prevElement != null) {
        prevElement.scrollIntoView()
      }
    })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await page
      .waitForSelector('button.fc-button-prev', {
        visible: true,
      })
      .then((el) => el?.click())
    await new Promise((resolve) => setTimeout(resolve, 5000))
    const after = await page.$eval(
      '.fc-header-title h2',
      (el) => (el as unknown as { innerText: string }).innerText // ?
    )
    console.log(`after: ${after}`)
    if (before === after) {
      console.log(`before == after. break;`)
      break
    }
    console.log(`before != after. next`)
  }
}

async function save(config: Config, page: Page) {
  console.log('save()')
  const dateText = await page.$eval(
    '.fc-header-title h2',
    (el) => (el as unknown as { innerText: string }).innerText // ?
  )
  const dates = dateText.split(' - ')
  const startDate = new Date(dates[0])
  console.log(`startDate: ${startDate.toString()}`)
  const endDate = new Date(dates[1])
  console.log(`endDate: ${endDate.toString()}`)
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
    fs.writeFileSync(`/data/${filename}.csv`, csv)
  }
  const tsv = await toTSV(page)
  if (tsv) {
    fs.writeFileSync(`/data/${filename}.tsv`, tsv)
  }
  page.screenshot({
    path: `/data/${filename}.png`,
    fullPage: true,
  })
  let html = await page.evaluate(() => {
    return document.getElementsByTagName('html')[0].innerHTML
  })
  const url = config.moneyforward.base_url
  html = html.replace(/href="\//g, `href="${url}`)
  html = html.replace(/src="\//g, `src="${url}`)
  fs.writeFileSync(`/data/${filename}.html`, html)
}

async function toCSV(page: Page) {
  console.log('toCSV()')
  return await page.evaluate(() => {
    const table: HTMLTableElement | null = document.querySelector(
      'table#cf-detail-table'
    )
    if (!table) {
      return null
    }
    let dataCsv = ''
    for (let i = 0; i < table.rows.length; i++) {
      for (let j = 0; j < table.rows[i].cells.length; j++) {
        dataCsv +=
          '"' + table.rows[i].cells[j].innerText.replace(/\n/g, '\\n') + '"'
        if (j === table.rows[i].cells.length - 1) dataCsv += '\n'
        else dataCsv += ','
      }
    }
    return dataCsv
  })
}

async function toTSV(page: Page) {
  console.log('toTSV()')
  return await page.evaluate(() => {
    const table: HTMLTableElement | null = document.querySelector(
      'table#cf-detail-table'
    )
    if (!table) {
      return null
    }
    let dataTsv = ''
    for (let i = 0; i < table.rows.length; i++) {
      for (let j = 0; j < table.rows[i].cells.length; j++) {
        dataTsv += table.rows[i].cells[j].innerText.replace(/\n/g, '\\n')
        if (j === table.rows[i].cells.length - 1) dataTsv += '\n'
        else dataTsv += '\t'
      }
    }
    return dataTsv
  })
}

function getYear(filedate: string, monthDay: string) {
  // filedate: 20201210 monthDay: 01/01(金) -> 2021
  // filedate: 20210210 monthDay: 02/13(金) -> 2021

  const year = filedate.slice(0, 4)

  // filedateが12月で、monthDayが1月の場合、yearは1年進む
  if (filedate.slice(4, 6) === '12' && monthDay.slice(0, 2) === '01') {
    return String(Number(year) + 1)
  }

  return year
}

async function saveAllCsv() {
  console.log('saveAllCsv()')

  const columns = {
    1: '日付',
    2: '内容',
    3: '金額',
    4: '保有金融機関',
    7: 'メモ',
  }

  const files = fs.readdirSync('/data')
  const csvFiles = files.filter(
    (file) => file.endsWith('.csv') && /^\d{8}/.test(file)
  )
  const headers = Object.values(columns).join(',')

  const allCsvs = []
  for (const file of csvFiles) {
    const tsv = fs.readFileSync(`/data/${file}`, 'utf8')
    const rows = tsv.split('\n').slice(1)
    const filedate = file.split(' - ')[0] // 20210101
    const allCsv = rows
      .filter((row) => row.length > 0)
      .map((row) => row.split(',').map((col) => col.replace(/^"(.+)"$/, '$1')))
      .map((row) => row.filter((_, i) => i in columns))
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

async function saveAllTsv() {
  console.log('saveAllTsv()')

  const columns = {
    1: '日付',
    2: '内容',
    3: '金額',
    4: '保有金融機関',
    7: 'メモ',
  }

  const files = fs.readdirSync('/data')
  const tsvFiles = files.filter(
    (file) => file.endsWith('.tsv') && /^\d{8}/.test(file)
  )
  const headers = Object.values(columns).join('\t')

  const allTsvs = []
  for (const file of tsvFiles) {
    const tsv = fs.readFileSync(`/data/${file}`, 'utf8')
    const rows = tsv.split('\n').slice(1)
    const filedate = file.split(' - ')[0] // 20210101
    const allTsv = rows
      .filter((row) => row.length > 0)
      .map((row) => row.split('\t'))
      .map((row) => row.filter((_, i) => i in columns))
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

async function main() {
  const configPath = process.env.CONFIG_PATH ?? 'config.json'
  const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  if (!config.moneyforward.base_url) {
    config.moneyforward.base_url = 'https://moneyforward.com'
  }

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
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu',
    ],
    ...config.puppeteer,
  }

  if (config.proxy && config.proxy.server) {
    puppeteerOptions.args?.push('--proxy-server=' + config.proxy.server)
  }

  const browser = await puppeteer.launch(puppeteerOptions)
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0'
  )
  if (config.proxy && config.proxy.username && config.proxy.password) {
    console.log('Login proxy')
    await page.authenticate({
      username: config.proxy.username,
      password: config.proxy.password,
    })
    console.log('Login proxy... done')
  }

  await login(config, page)
  await cf(config, page)

  await browser.close()

  await saveAllCsv()
  await saveAllTsv()
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
