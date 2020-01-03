require("dotenv").config();

const puppeteer = require('puppeteer');
const {
    TimeoutError
} = require('puppeteer/Errors');
const fs = require('fs');
const path = require('path');
const scriptName = path.basename(__filename);
const options = {
    "headless": false,
    "slowMo": 'SLOWMO' in process.env ? parseInt(process.env.SLOWMO, 10) : 200,
    "defaultViewport": {
        "width": 'VIEWPORT_WIDTH' in process.env ? parseInt(process.env.VIEWPORT_WIDTH, 10) : 1024,
        "height": 'VIEWPORT_HEIGHT' in process.env ? parseInt(process.env.VIEWPORT_HEIGHT, 10) : 768
    }
};
(async () => {
    const browser = await puppeteer.launch(options);
    let page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0');

    await login(page);
    await cf(page);

    await browser.close();

    async function login(page) {
        console.log("login()");
        await page.goto("https://ssnb.x.moneyforward.com/users/sign_in");
        await page.waitFor(3000);

        const mail_address = process.env.MAIL_ADDRESS;
        const password = process.env.PASSWORD;

        await page.waitForSelector('#sign_in_session_service_email', {
                visible: true
            })
            .then(el => el.type(mail_address));
        await page.waitForSelector('#sign_in_session_service_password', {
                visible: true
            })
            .then(el => el.type(password));
        await page.waitFor(1000);
        await page.waitForSelector('#login-btn-sumit', {
                visible: true
            })
            .then(el => el.click());
    }
    async function cf(page) {
        console.log("cf()");
        await page.goto("https://ssnb.x.moneyforward.com/cf");
        await page.waitFor(3000);

        //button.fc-button-prev

        while (true) {
            let before = await page.$eval(".fc-header-title h2", el => el.textContent);
            console.log(`before: ${before}`);

            await save(page);

            await page.waitForSelector('button.fc-button-prev', {
                    visible: true
                })
                .then(el => el.click());
            await page.waitFor(5000);
            let after = await page.$eval(".fc-header-title h2", el => el.innerText);
            console.log(`after: ${after}`);
            if (before == after) {
                console.log(`before == after. break;`);
                break;
            }
            console.log(`before != after. next`);
        }
    }
    async function save(page) {
        console.log("save()");
        let dateText = await page.$eval(".fc-header-title h2", el => el.innerText);
        let dates = dateText.split(" - ");
        let startDate = new Date(dates[0]);
        console.log(`startDate: ${startDate.toString()}`);
        let endDate = new Date(dates[1]);
        console.log(`endDate: ${endDate.toString()}`);
        let filename = `${startDate.getFullYear()}${(startDate.getMonth()+1).toString().padStart(2, "0")}${startDate.getDate().toString().padStart(2, '0')} - ${endDate.getFullYear()}${(endDate.getMonth()+1).toString().padStart(2, "0")}${endDate.getDate().toString().padStart(2, '0')}`;
        let data = await toCSV(page);
        fs.writeFileSync(`${__dirname}/data/${filename}.csv`, data);
    }
    async function toCSV(page) {
        console.log("toCSV()");
        return await page.evaluate(() => {
            let table = document.querySelector("table#cf-detail-table");
            if (!table) {
                return null;
            }
            let data_csv = "";
            for (var i = 0; i < table.rows.length; i++) {
                for (var j = 0; j < table.rows[i].cells.length; j++) {
                    data_csv += "\"" + table.rows[i].cells[j].innerText.replace(/\n/g, '\\n') + "\"";
                    if (j == table.rows[i].cells.length - 1) data_csv += "\n";
                    else data_csv += ",";
                }
            }
            return data_csv;
        });
    }
})();