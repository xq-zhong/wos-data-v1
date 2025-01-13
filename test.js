const puppeteer = require('puppeteer');
const fs = require('fs');

// 模拟的批量数据处理函数，随机返回成功或失败
async function processBatch(data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // 模拟成功率 80%
            if (Math.random() < 0.6) resolve(true);
            else reject(new Error("Processing failed"));
        }, 100);
    });
}

async function downloadData(level, start, end, retryCount = 10) {
    // const browser = await puppeteer.launch({ headless: true });
    // const page = await browser.newPage();

    try {
        // // 打开目标网页
        // await page.goto('https://example.com/data', { waitUntil: 'networkidle2' });

        // // 模拟用户操作，例如点击下载按钮或填写表单
        // // 这里假设有一个输入框可以指定下载的起始和结束条数
        // await page.type('#startInput', start.toString());
        // await page.type('#endInput', end.toString());
        // await page.click('#downloadButton');

        // // 等待下载完成，这里假设下载完成后页面会显示一个提示
        // await page.waitForSelector('#downloadComplete', { timeout: 60000 });

        // console.log(`Successfully downloaded data from ${start} to ${end}`);

        // console.log(`下载开始： ${start}~${end}`);
        await processBatch(start);
        console.log(`**********下载完成**********： ${start}~${end}`);
        // 写入txt文件  
        fs.appendFileSync('data.txt', `下载完成--OOOOO： ${level}： ${start}~${end}\n`);

    } catch (error) {
        // console.error(`下载超时： ${start} to ${end}:`, error);
        console.log(`下载超时： ${start} to ${end}:`);

        // 如果是最后10行数据，直接抛出异常
        if ((end - start + 1) <= 10) {
            fs.appendFileSync('data.txt', `下载失败--1111111： ${level}： ${start}~${end}\n`);
            console.error(`下载失败--1111111： ${start} to ${end}:`);
            throw error;
        }

        if (retryCount > 0) {
            // 如果下载失败，减少下载条数并重试
            const newEnd = start + Math.floor((end - start) / 2);
            console.log(`Retrying with reduced range: ${start} to ${newEnd}`);
            await downloadData('递归下载', start, newEnd, retryCount - 1);
            await downloadData('递归下载', newEnd + 1, end, retryCount - 1);
        } else {
            fs.appendFileSync('data.txt', `下载失败--2222222： ${level}： ${start}~${end}\n`);
            console.error(`下载失败--2222222： ${start} to ${end}:`);
        }
    } finally {
        // await browser.close();
    }
}

async function downloadAllData(totalItems) {
    const batchSize = 100;
    let start = 1;

    while (start <= totalItems) {
        const end = Math.min(start + batchSize - 1, totalItems);
        console.log(`=========下载开始： ${start} to ${end}=========`);
        await downloadData('第一层', start, end);
        console.log(`=========下载结束： ${start} to ${end}=========`);

        start = end + 1;
    }
}

const data =[
    {name:'张三',year:2015},{name:'张三',year:2015-2024}
];

async function main() {
    // const browser = await puppeteer.launch({ headless: true });
    // const page = await browser.newPage();

    for(const item of data){
        // 获取开始，结束年份，获取方式是，如果item.year是固定年份，则开始和结束年份相同，如果item.year是范围，则开始和结束年份分别为item.year的开始和结束年份
        // 例如：item.year=[2015]，则开始和结束年份分别为2015和2015
        // 例如：item.year=[2015,2024]，则开始和结束年份分别为2015和2024
        let start = item.year[0];
        let end = item.year[0];
        if(item.year.length>1){
            end = item.year[1];
        }

        
        
    }

    return;

    try {
        // 打开目标网页并获取数据总条数
        // await page.goto('https://example.com/data', { waitUntil: 'networkidle2' });
        // const totalItems = await page.evaluate(() => {
        //     return parseInt(document.querySelector('#totalItems').innerText, 10);
        // });

        // console.log(`Total items to download: ${totalItems}`);

        const totalItems = 5205;
        // 开始下载所有数据
        await downloadAllData(totalItems);
    } catch (error) {
        console.error('Error during initial setup:', error);
    } finally {
        // await browser.close();
    }
}

main();