const puppeteer = require('puppeteer');
const fs = require('fs');
const xlsx = require('xlsx');
const { setBaseFilter, setDocumentType, setFilterNameAndYear, getCountByNameAndYear, setDownDir, pullData } = require('../utils/wosUtils');
const { sleep, getRandomMs, updateJsonFile, createDirs, isProcessed, isNotDirEmpty, getFormattedTime, getEmpData } = require('../utils/utils');
// const { logToFile } = require('./logUtils');

const wos_url = 'https://webofscience.clarivate.cn/wos/woscc/basic-search';

class WosBase {
    constructor() {
        this._exportNumsByOne = 0;
        this._outputUni = '';
        this._jsonfilepath = '';
        this._isCheckUni = false;
        this._uniNameDefault = '';
        this._uniYearDefault = '';
    }

    get exportNumsByOne() {
        return this._exportNumsByOne;
    }

    set exportNumsByOne(value) {
        this._exportNumsByOne = value;
    }

    get outputUni() {
        return this._outputUni;
    }

    set outputUni(value) {
        this._outputUni = value;
    }

    get jsonfilepath() {
        return this._jsonfilepath;
    }

    set jsonfilepath(value) {
        this._jsonfilepath = value;
    }

    get isCheckUni() {
        return this._isCheckUni;
    }

    set isCheckUni(value) {
        this._isCheckUni = value;
    }

    get uniNameDefault() {
        return this._uniNameDefault;
    }

    set uniNameDefault(value) {
        this._uniNameDefault = value;
    }

    get uniYearDefault() {
        return this._uniYearDefault;
    }

    set uniYearDefault(value) {
        this._uniYearDefault = value;
    }

    async run() {
        console.log(`[${this.getTime()}] start`);
        const browser = await puppeteer.launch({ headless: false });

        try {
            // 在浏览器中打开目标网页
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 1024 });
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
            await page.setUserAgent(userAgent);
            await page.goto(wos_url, { waitUntil: 'networkidle0' });
            console.log('打开目标网页');
            if (this.uniNameDefault && this.uniYearDefault) {
                await setBaseFilter(page, this.uniNameDefault, this.uniYearDefault);
            } else {
                await setBaseFilter(page);
            }
            console.log('设置基本筛选条件');
            await setDocumentType(page);
            console.log('排除');

            await sleep(() => getRandomMs(3000, 5000));

            await this.process(page, false);

            // console.log('处理完成，继续处理超时的数据');

            // let i = 10;
            // while (i > 0) {
            //     await process(page, jsonfilepath, true);
            //     i--;
            // }

            // const failsData = await getFailsRowNumByCount(jsonfilepath, exportNumsByOne);
            // fs.writeFileSync(jsonfilepath + '.not', JSON.stringify(notEx, failsData, 4));

            // const workbook = xlsx.utils.book_new();
            // const sheet = xlsx.utils.json_to_sheet(failsData);
            // xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1');
            // xlsx.writeFile(workbook, `${jsonfilepath}.not.xlsx`);
            if (browser && browser.close)
                await browser.close();
        } catch (err) {
            if (browser && browser.close)
                await browser.close();
            console.log('发生错误:', err);
            // logToFile('发生错误:', false, err = err);
            const retryTime = getRandomMs(1000 * 1, 1000 * 2);
            console.log(`等待 ${retryTime / 1000} 秒后重启...`);
            setTimeout(() => {
                this.run().catch(e => {
                    console.error("重试时发生错误:", e);
                });
            }, retryTime);
        }
    }

    async process(page, isRetry = false) {
        throw new Error("必须在子类中实现该方法");
    }

    async setFilterNameAndYear(page, name, year) {
        await setFilterNameAndYear(page, name, year);
    }

    async getCountByNameAndYear(page) {
        return await getCountByNameAndYear(page);
    }

    async pullData(page, name, year, startRow, endRow) {
        return await pullData(page, name, year, startRow, endRow);
    }

    async getEmpData(basePath = './wos') {
        return await getEmpData(basePath);
    }

    async getEmpDataUni(basePath = './uni') {
        return await getEmpDataUni(basePath);
    }

    async getEmpUni(basePath = './uni') {
        return await getEmpUni(basePath);
    }

    async isNotDirEmpty(dirPath, pCount = 100) {
        return await isNotDirEmpty(dirPath, pCount);
    }

    async isOnline(url) {
        return await isOnline(url);
    }

    async updateJsonFile(filePath, jsonData) {
        return await updateJsonFile(filePath, jsonData);
    }

    async setDownDir(page, downDir) {
        setDownDir(page, downDir);
    }

    getTime() {
        return getFormattedTime();
    }

    createDirs(dirPath) {
        createDirs(dirPath);
    }
}

module.exports = WosBase;