const WosBase = require('./WosBase');
const fs = require('fs');
const xlsx = require('xlsx');
const { sleep, getRandomMs, isNotDirEmpty } = require('../utils/utils');

const ERR_JSON = 'WosDataRecursion-error.json';
const RECORD_JSON = 'WosDataRecursion-record.json';

class WosDataRecursion extends WosBase {
    // 构造函数
    constructor() {
        super();
        //每次处理的行数
        this.exportNumsByOne = 1000;
        //输出文件路径
        this.outputUni = `E:/wos-0108-1`;
        //json文件路径（定义了要处理的大学及年份等）
        this.jsonfilepath = 'WosDataRecursion.json';
    }

    async updateRecord(fileName, uniName, year, rows, successRows, failsRows, endRow) {
        if (!fs.existsSync(fileName)) {
            fs.writeFileSync(RECORD_JSON, JSON.stringify({ 'name': uniName, 'year': year, rows: rows, 'successRows': successRows, 'failsRows': failsRows, 'end': endRow }));
        } else {
            let recordData = JSON.parse(fs.readFileSync(fileName, 'utf8'));
            const matchingItem = recordData.find(item => item.name === uniName && item.year === year);
            if (matchingItem) {
                if (endRow)
                    matchingItem.end = endRow;
                matchingItem.successRows += successRows;
                matchingItem.failsRows += failsRows;
            } else {
                recordData.push({ 'name': uniName, 'year': year, rows: rows, 'successRows': successRows, 'failsRows': failsRows, 'end': endRow });
            }
            fs.writeFileSync(fileName, JSON.stringify(recordData));
        }
    }

    async processBatch(page, name, year, startRow, endRow) {
        const downPath = `${this.outputUni}/${name}/${year}/${startRow}-${endRow}`;
        await this.createDirs(`${downPath}`);
        await this.setDownDir(page, `${downPath}`);
        await this.pullData(page, name, year, startRow, endRow);
        const downTrue = await isNotDirEmpty(`${downPath}`, 150);
        if (downTrue) {
            // console.log(`[${this.getTime()}] 处理完成: ${name} - ${year}年  第${startRow}~${endRow}行`);
            const downWin = await page.$('app-input-route:nth-of-type(2) span.mat-button-wrapper > span');
            if (downWin) {
                await downWin.click();
            }
        } else {
            // 超时则关闭导出窗口
            await page.locator('app-input-route:nth-of-type(2) span.mat-button-wrapper > span').click();
            throw new Error('超时了！');
        }
    }

    async downloadData(page, uniName, year, start, end, retryCount = 10) {
        try {
            console.log(`[${this.getTime()}] ****下载开始：${uniName}：${year}： ${start} to ${end}`);
            await processBatch(page, uniName, year, start, end);
            console.log(`[${this.getTime()}] ****下载完成：${uniName}：${year}： ${start} to ${end}`);
            // 记录处理进度{uniName,year,successRows,failsRows,end}
            await updateRecord(RECORD_JSON, uniName, year, 0, end - start + 1, 0, end);
            // 下载成功后，从ERR_JSON中删除该错误信息（如果有）
            if (fs.existsSync(ERR_JSON)) {
                let errData = JSON.parse(fs.readFileSync(ERR_JSON, 'utf8'));
                const matchingItem = errData.find(item => item.name === uniName && item.year === year && item.start === start && item.end === end);
                // 错误大于3次的，会跳过不处理，所以只删除错误次数小于等于3的
                if (matchingItem && matchingItem.errNums <= 3) {
                    errData = errData.filter(item => item !== matchingItem);
                    fs.writeFileSync(ERR_JSON, JSON.stringify(errData));
                }
            }
        } catch (error) {
            console.log(`[${this.getTime()}] 下载出错： ${start} to ${end}:`, error);

            // 如果处理行数为10以下，记录错误信息，并抛出异常，如果错误超过3次，则跳过该错误
            if ((end - start + 1) <= 10) {
                const errObj = { 'name': uniName, 'year': year, 'start': start, 'end': end, errNums: 0 };
                if (!fs.existsSync(ERR_JSON)) {
                    errObj.errNums = 1;
                    let errData = [];
                    errData.push(errObj);
                    fs.writeFileSync(ERR_JSON, JSON.stringify(errData));
                } else {
                    let errData = JSON.parse(fs.readFileSync(ERR_JSON, 'utf8'));
                    const matchingItem = errData.find(item => item.name === uniName && item.year === year && item.start === start && item.end === end);

                    if (matchingItem) {
                        matchingItem.errNums++;
                        if (matchingItem.errNums > 3) {
                            console.log(`[${this.getTime()}] 错误次数超过3次，跳过。`);
                            // 更新错误行数
                            await updateRecord(RECORD_JSON, uniName, year, 0, 0, end - start + 1);
                            return;
                        } else {
                            fs.writeFileSync(ERR_JSON, JSON.stringify(errData));
                            throw error;
                        }
                    } else {
                        errObj.errNums = 1;
                        errData.push(errObj);
                        fs.writeFileSync(ERR_JSON, JSON.stringify(errData));
                        throw error;
                    }
                }
            }

            if (retryCount > 0) {
                // 如果下载失败，减少下载条数并重试
                const newEnd = start + Math.floor((end - start) / 2);
                console.log(`[${this.getTime()}] 缩小下载范围重试: ${start} to ${newEnd}`);
                await downloadData(page, uniName, year, start, newEnd, retryCount - 1);
                await downloadData(page, uniName, year, newEnd + 1, end, retryCount - 1);
            } else {
                // fs.appendFileSync('data.txt', `下载失败--2222222： ${level}： ${start}~${end}\n`);
                // console.error(`下载失败--2222222： ${start} to ${end}:`);
                throw error;
            }
        } finally {
        }
    }

    // {
    //     name: '清华大学',
    //     year: '2015'/'2015-2024',
    // }
    async process(page) {
        // 读取json文件，获取要处理的数据集（大学，年份，要处理的行数）
        const jsonData = await fs.promises.readFile(this.jsonfilepath, 'utf8');
        let data = JSON.parse(jsonData);

        // 读取record.json文件，获取上次处理的状态
        let recordData = [];
        if (fs.existsSync(fileRecord)) {
            recordData = JSON.parse(fs.readFileSync(fileRecord, 'utf8'));
        }

        for (const item of data) {
            const { start, end } = item.year.includes('-')
                ? { start: item.year.split('-')[0], end: item.year.split('-')[1] }
                : { start: item.year, end: item.year };

            for (let year = start; year <= end; year++) {
                let matchingItem = recordData?.find(item => item.name === item.name && item.year === year);
                if (matchingItem && matchingItem.successRows + matchingItem.failsRows === matchingItem.rows) {
                    continue;
                }

                console.log(`[${this.getTime()}] ==下载开始: ${item.name} - ${year}年`);

                // 设定筛选条件
                await this.setFilterNameAndYear(page, item.name, year);
                await sleep(() => getRandomMs(3000, 3500));

                // 获取总行数
                const allRows = await this.getCountByNameAndYear(page);
                if (!matchingItem)
                    await updateRecord(RECORD_JSON, uniName, year, allRows, 0, 0);

                // 开始导出
                let startIndex = matchingItem ? matchingItem.end ? matchingItem.end + 1 : 1 : 1;
                while (startIndex <= allRows) {
                    const endIndex = Math.min(start + this.exportNumsByOne - 1, allRows);
                    await downloadData(page, item.name, year, startIndex, endIndex);
                    startIndex = endIndex + 1;
                }

                console.log(`[${this.getTime()}] ==下载完成: ${item.name} - ${year}年`);
            }
        }
    }
}

module.exports = WosDataRecursion;
