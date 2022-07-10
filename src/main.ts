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
  puppeteer?: { [key: string]: unknown }
}

async function login(config: Config, page: Page) {
  console.log('login()')
  const url = config.moneyforward.base_url
  await page.goto(`${url}/users/sign_in`)
  await page.waitForTimeout(3000)

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
  await page.waitForTimeout(1000)
  await page
    .waitForSelector('#login-btn-sumit', {
      visible: true,
    })
    .then((el) => el?.click())
  await page.waitForTimeout(3000)
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

    await page.waitForTimeout(5000)
    await page.evaluate(() => {
      const prevElement = document.querySelector(`button.fc-button-prev`)
      if (prevElement != null) {
        prevElement.scrollIntoView()
      }
    })
    await page.waitForTimeout(2000)
    await page
      .waitForSelector('button.fc-button-prev', {
        visible: true,
      })
      .then((el) => el?.click())
    await page.waitForTimeout(5000)
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
  const data = await toCSV(page)
  if (data) {
    fs.writeFileSync(`/data/${filename}.csv`, data)
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

  const browser = await puppeteer.launch(puppeteerOptions)
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0'
  )

  await login(config, page)
  await cf(config, page)

  await browser.close()
}

;(async () => {
  await main()
})()
