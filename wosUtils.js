const path = require('path');
const { getRandomMs, sleep } = require('./utils');


/**
 * 
 * @param {每次第一次打开网站，先设定基本的筛选条件} page 
 * @param {*} name 
 * @param {*} year 
 */
async function setBaseFilter(page, name = '', year = '2015-2024') {
    await page.locator('#onetrust-accept-btn-handler').click();
    await sleep(() => getRandomMs(300, 1000));

    //设定筛选条件（类别）
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('#snSelectEd').click();
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('mat-checkbox[araia-label="Index Chemicus<br/>(IC)--1993-present"]').click();
    // await page.locator('mat-checkbox:nth-last-of-type(3)').click();
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('mat-checkbox[araia-label="Current Chemical Reactions<br/>(CCR-EXPANDED)--1985-present"]').click();
    // await page.locator('mat-checkbox:nth-last-of-type(2)').click();
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('mat-checkbox[araia-label="Emerging Sources Citation Index<br/>(ESCI)--2020-present"]').click();
    // await page.locator('mat-checkbox:nth-last-of-type(1)').click();
    await sleep(() => getRandomMs(300, 1000));

    //设定大学名
    await page.locator('div.row button').click();
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('input[placeholder="Search"]').fill('Affiliation');
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('div.options').click();
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('#search-option').fill(name);

    //设定年份
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('button.add-row > span.mat-button-wrapper').click();
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('#snSearchType > div:nth-of-type(2) app-select-search-field span.dropdown-text').click();
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('input[placeholder="Search"]').fill('Year Published');
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('div.options').click();
    await page.locator('#snSearchType > div:nth-of-type(2) input').fill(year);

    //检索
    await sleep(() => getRandomMs(300, 1000));
    await page.locator('button.search > span.mat-button-wrapper').click();
}


/**
 * 
 * @param {排除} page 
 * @returns 
 */
async function setDocumentType(page) {
    const setDocType = async (page, s, changeNum) => {
        // await sleep(() => getRandomMs(100, 300));
        const locators = await page.$(s);
        await sleep(() => getRandomMs(300, 1000));
        if (locators) {
            changeNum = changeNum + 1;
            await locators.click();
        }

        return changeNum;
    };

    let changeNum = 0;
    await sleep(() => getRandomMs(300, 500));
    await page.locator('div.filter-section-border-2 button.more > span.mat-button-wrapper').click();
    // await sleep(() => getRandomMs(1000, 3000));

    await page.waitForSelector('div.options ul');

    await sleep(() => getRandomMs(500, 800));
    await page.locator('input[placeholder="Search for Document Types"]').fill('Meeting Abstract');
    await sleep(() => getRandomMs(300, 500));
    // await page.locator('div.options span.mat-checkbox-inner-container').click();
    changeNum = await setDocType(page, 'div.options span.mat-checkbox-inner-container', changeNum);

    await sleep(() => getRandomMs(300, 500));
    await page.locator('input[placeholder="Search for Document Types"]').fill('Letter');
    await sleep(() => getRandomMs(300, 500));
    // await page.locator('div.options span.mat-checkbox-inner-container').click();
    changeNum = await setDocType(page, 'div.options span.mat-checkbox-inner-container', changeNum);

    await sleep(() => getRandomMs(300, 500));
    await page.locator('input[placeholder="Search for Document Types"]').fill('Correction');
    await sleep(() => getRandomMs(300, 500));
    // await page.locator('div.options span.mat-checkbox-inner-container').click();
    changeNum = await setDocType(page, 'div.options span.mat-checkbox-inner-container', changeNum);

    await sleep(() => getRandomMs(300, 500));
    await page.locator('input[placeholder="Search for Document Types"]').fill('Retraction');
    await sleep(() => getRandomMs(300, 500));
    // await page.locator('div.options span.mat-checkbox-inner-container').click();
    changeNum = await setDocType(page, 'div.options span.mat-checkbox-inner-container', changeNum);

    await sleep(() => getRandomMs(300, 500));
    await page.locator('input[placeholder="Search for Document Types"]').fill('Retracted Publication');
    await sleep(() => getRandomMs(300, 500));
    changeNum = await setDocType(page, 'div.options span.mat-checkbox-inner-container', changeNum);


    await sleep(() => getRandomMs(300, 500));
    await page.locator('input[placeholder="Search for Document Types"]').fill('Item Withdrawal');
    await sleep(() => getRandomMs(300, 500));
    // await page.locator('div.options span.mat-checkbox-inner-container').click();
    changeNum = await setDocType(page, 'div.options span.mat-checkbox-inner-container', changeNum);

    await sleep(() => getRandomMs(300, 500));
    await page.locator('input[placeholder="Search for Document Types"]').fill('Withdrawn Publication');
    await sleep(() => getRandomMs(300, 500));
    // await page.locator('div.options span.mat-checkbox-inner-container').click();
    changeNum = await setDocType(page, 'div.options span.mat-checkbox-inner-container', changeNum);

    await sleep(() => getRandomMs(300, 500));
    if (changeNum > 0) {
        await page.locator('div.summary-refine-see-alls button:nth-of-type(2) > span.mat-button-wrapper').click();
    } else {
        await page.locator('div.summary-refine-see-alls button:nth-of-type(1) > span.mat-button-wrapper').click();
    }
}


async function getCountByNameAndYear(page) {
    await sleep(() => getRandomMs(3000, 5000));
    await page.waitForSelector('.tab-results-count', { timeout: 15000 });
    const resultsCount = await page.$eval('.tab-results-count', el => {
        const text = el.textContent || el.innerText;
        const number = text.replace(/[^\d]/g, '');
        return parseInt(number, 10);
    }).catch(() => -1);

    console.log(resultsCount);

    return resultsCount;
}

async function pullData(page, name, year, startRow, endRow) {
    await sleep(() => getRandomMs(1000, 2000));
    await page.locator('app-export-menu span.mat-button-wrapper').click();
    // console.log('展开菜单');    
    await sleep(() => getRandomMs(1000, 2000));
    await page.locator('#exportToFieldTaggedButton').click();
    // console.log('点击导出菜单');
    await sleep(() => getRandomMs(500, 800));
    await page.locator('div.radio-group-last span.mat-radio-label-content').click();
    // console.log('选择指定件数');
    await sleep(() => getRandomMs(500, 800));
    await page.locator('input[name="markFrom"]').fill(startRow.toString());
    // console.log('指定件数-start');
    await sleep(() => getRandomMs(500, 800));
    await page.locator('input[name="markTo"]').fill(endRow.toString());
    // console.log('指定件数-end');
    await sleep(() => getRandomMs(500, 800));
    await page.locator('form > div > div.ng-star-inserted button').click();
    // console.log('展开输出类型菜单');
    await sleep(() => getRandomMs(500, 800));
    await page.locator('div[title="Full Record"]').click();
    // console.log('选择输出类型');
    await sleep(() => getRandomMs(500, 1000));
    await page.locator('app-input-route:nth-of-type(1) span.mat-button-wrapper > span').click();
    // console.log('点击导出按钮');
    // console.log(`处理中: ${name} - ${year}年 - 第${startRow}~${endRow}行`);
}

/***
 * 设定大学名和年份并检索
 */
async function setFilterNameAndYear(page, name, year) {
    await sleep(() => getRandomMs(1000, 2000));
    await page.locator('button.qmInputBox').click();
    await sleep(() => getRandomMs(500, 800));
    await page.locator('#snSearchType > div:nth-of-type(1) input').fill(name);
    await sleep(() => getRandomMs(500, 800));
    await page.locator('#snSearchType > div:nth-of-type(2) input').fill(year.toString());
    await sleep(() => getRandomMs(500, 800));
    await page.locator('button.search > span.mat-button-wrapper').click();
}

async function setDownDir(page, dir) {
    const downloadPath = path.resolve(__dirname, dir);
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
    });
}

module.exports = {
    setBaseFilter,
    setDocumentType,
    getCountByNameAndYear,
    pullData,
    setFilterNameAndYear,
    setDownDir
};