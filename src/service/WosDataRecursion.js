const WosBase = require('./WosBase');
const fs = require('fs');
const xlsx = require('xlsx');
const { sleep, getRandomMs, isNotDirEmpty } = require('../utils/utils');
const { TimeoutError } = require('puppeteer');

const ERR_JSON = '../data/WosDataRecursion-error.json';
const RECORD_JSON = '../data/WosDataRecursion-record.json';

class WosDataRecursion extends WosBase {
    // 构造函数
    constructor() {
        super();
        //每次处理的行数
        this.exportNumsByOne = 1000;
        //输出文件路径
        this.outputUni = `E:/wos-0108-1`;
        //json文件路径（定义了要处理的大学及年份等）
        this.jsonfilepath = './data/test.json';
    }

    async processBatch1(page, name, year, startRow, endRow) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 模拟成功率 80%
                if (Math.random() < 0.5) resolve(true);
                else reject(new Error("Processing failed"));
            }, 100);
        });
    }

    /**
 * 更新记录文件中的数据。
 * 如果记录文件不存在，则创建一个新的记录文件并写入初始数据。
 * 如果记录文件存在，则更新或添加新的记录。
 * 
 * @param {string} fileName - 记录文件的路径。
 * @param {string} uniName - 大学名称。
 * @param {string} year - 年份。
 * @param {number} rows - 总行数。
 * @param {number} successRows - 成功行数。
 * @param {number} failsRows - 失败行数。
 * @param {number} endRow - 结束行号。
 */
    async updateRecord(fileName, uniName, year, rows, successRows, failsRows, endRow) {
        if (!fs.existsSync(fileName)) {
            const recordData = [];
            recordData.push({ 'name': uniName, 'year': year, rows: rows, 'successRows': successRows, 'failsRows': failsRows, 'end': endRow });
            fs.writeFileSync(RECORD_JSON, JSON.stringify(recordData, null, 2));
        } else {
            let recordData = JSON.parse(fs.readFileSync(fileName, 'utf8'));
            const matchingItem = recordData.find(item => item.name == uniName && item.year == year);
            if (matchingItem) {
                if (endRow)
                    matchingItem.end = endRow;
                matchingItem.successRows += successRows;
                matchingItem.failsRows += failsRows;
            } else {
                recordData.push({ 'name': uniName, 'year': year, rows: rows, 'successRows': successRows, 'failsRows': failsRows, 'end': endRow });
            }
            fs.writeFileSync(fileName, JSON.stringify(recordData, null, 2));
        }
    }

    async processBatch(page, name, year, startRow, endRow) {
        const downPath = `${this.outputUni}/${name}/${year}/${startRow}-${endRow}`;
        await this.createDirs(`${downPath}`);
        await this.setDownDir(page, `${downPath}`);
        await this.pullData(page, name, year, startRow, endRow);
        const downTrue = await isNotDirEmpty(`${downPath}`, 150);
        if (downTrue) {
            const downWin = await page.$('app-input-route:nth-of-type(2) span.mat-button-wrapper > span');
            if (downWin) {
                await downWin.click();
            }
        } else {
            // 超时则关闭导出窗口
            await page.locator('app-input-route:nth-of-type(2) span.mat-button-wrapper > span').click();
            throw new TimeoutErrorError('下载超时，请重试。')
        }
    }

    async downloadData(page, uniName, year, start, end, retryCount = 10) {
        try {
            console.log(`[${this.getTime()}] ****下载开始：${uniName}：${year}： ${start} to ${end}`);
            await this.processBatch(page, uniName, year, start, end);
            // await this.processBatch1();
            console.log(`[${this.getTime()}] ****下载完成：${uniName}：${year}： ${start} to ${end}`);
            // 2.处理成功后，更新处理进度（成功行数，及处理到哪一行）
            await this.updateRecord(RECORD_JSON, uniName, year, 0, end - start + 1, 0, end);
            // 下载成功后，删除错误日志
            let errData = JSON.parse(fs.readFileSync(ERR_JSON, 'utf8'));
            const matchingItem = errData.find(item => item.name == uniName && item.year == year && item.start == start && item.end == end);
            if (matchingItem) {
                errData = errData.filter(item => item !== matchingItem);
                fs.writeFileSync(ERR_JSON, JSON.stringify(errData, null, 2));
            }
        } catch (error) {
            // if (error instanceof TimeoutError) {
            console.log(`[${this.getTime()}] 下载出错： ${start} to ${end}:`, error);

            // 递归处理，直到处理行数为1，记录日志并重试，错误次数超过3次则跳过
            if (end == start) {
                const errObj = { 'name': uniName, 'year': year, 'start': start, 'end': end, errNums: 0 };
                if (!fs.existsSync(ERR_JSON)) {
                    errObj.errNums = 1;
                    let errData = [];
                    errData.push(errObj);
                    fs.writeFileSync(ERR_JSON, JSON.stringify(errData, null, 2));
                } else {
                    let errData = JSON.parse(fs.readFileSync(ERR_JSON, 'utf8'));
                    const matchingItem = errData.find(item => item.name == uniName && item.year == year && item.start == start && item.end == end);

                    if (matchingItem) {
                        if (matchingItem.errNums == 3) {
                            console.log(`[${this.getTime()}] 错误次数超过3次，跳过。`);
                            // 3.超过3次错误，更新处理进度（记录失败的行数，以及处理到哪一行）
                            await this.updateRecord(RECORD_JSON, uniName, year, 0, 0, end - start + 1, end);
                            return;
                        } else {
                            matchingItem.errNums++;
                            fs.writeFileSync(ERR_JSON, JSON.stringify(errData, null, 2));
                            throw error;
                        }
                    } else {
                        errObj.errNums = 1;
                        errData.push(errObj);
                        fs.writeFileSync(ERR_JSON, JSON.stringify(errData, null, 2));
                        throw error;
                    }
                }
            }

            // 如果下载失败，减少下载条数并重试
            if (retryCount > 0) {
                const newEnd = start + Math.floor((end - start) / 2);
                console.log(`[${this.getTime()}] 缩小下载范围重试: ${start} to ${newEnd}`);
                await this.downloadData(page, uniName, year, start, newEnd, retryCount - 1);
                await this.downloadData(page, uniName, year, newEnd + 1, end, retryCount - 1);
            } else {
                // 不会到达分支
                throw error;
            }
            // } else {
            //     throw error;
            // }
        }
    }

    async process(page) {
        // 读取要处理的大学及年份（json格式如下）
        // {
        //     name: '清华大学',
        //     year: '2015'/'2015-2024',
        // }
        const jsonData = await fs.promises.readFile(this.jsonfilepath, 'utf8');
        let data = JSON.parse(jsonData);

        // 读取进度
        let recordData = [];
        if (fs.existsSync(RECORD_JSON)) {
            recordData = JSON.parse(fs.readFileSync(RECORD_JSON, 'utf8'));
        }

        for (const item of data) {
            const { start, end } = item.year.includes('-')
                ? { start: item.year.split('-')[0], end: item.year.split('-')[1] }
                : { start: item.year, end: item.year };

            for (let year = start; year <= end; year++) {
                // 跳过已处理的年份
                let matchingItem;
                if (recordData)
                    matchingItem = recordData.find(v => v.name == item.name && v.year == year);
                if (matchingItem && matchingItem.successRows + matchingItem.failsRows == matchingItem.rows) {
                    continue;
                }

                console.log(`[${this.getTime()}] ==下载开始: ${item.name} - ${year}年`);

                // 设定筛选条件
                await this.setFilterNameAndYear(page, item.name, year);
                await sleep(() => getRandomMs(3000, 3500));

                // 获取总行数
                const allRows = await this.getCountByNameAndYear(page);

                // const allRows = 5004;
                if (!matchingItem)
                    // 1.首次获取总行数，更新到进度文件（进度：成功数，失败数，以及处理到那一行都初始化为0）
                    await this.updateRecord(RECORD_JSON, item.name, year, allRows, 0, 0, 0);

                // TODO：如果总行数变化，是否需要重新处理？

                // 开始导出
                let startIndex = matchingItem ? matchingItem.end ? matchingItem.end + 1 : 1 : 1;
                while (startIndex <= allRows) {
                    const endIndex = Math.min(startIndex + this.exportNumsByOne - 1, allRows);
                    await this.downloadData(page, item.name, year, startIndex, endIndex);
                    startIndex = endIndex + 1;
                }

                console.log(`[${this.getTime()}] ==下载完成: ${item.name} - ${year}年`);
            }
        }
    }
}

module.exports = WosDataRecursion;
