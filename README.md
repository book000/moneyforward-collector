# moneyforward-collector

MoneyForwardの「家計」にある入出金明細をCSVで出力する。ついでにスクリーンショットも撮る。

## Setup

```npm i```

## Run

```node main.js```

## Requirement

- puppeteer
- dotenv

## Configuration

`.env`

- MAIL_ADDRESS: Login mail address
- PASSWORD: Login password

## Directory structure

- node_modules/
  - ...
- data/
  - yymmdd - yymmdd.csv
  - yymmdd - yymmdd.png
  - yymmdd - yymmdd.html
- .env
- .env.example
- .gitignore
- main.js
- package-lock.json
- package.json
