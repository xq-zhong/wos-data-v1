const WosBase = require('./WosBase');
const fs = require('fs');
const xlsx = require('xlsx');
const { sleep, getRandomMs, isNotDirEmpty } = require('../utils/utils');
const { TimeoutError } = require('puppeteer');

const { RecordDao, FailDao } = require('../database/dao');
const sequelize = require('../database');

class WosDownload extends WosBase {
    constructor() {
        super();
        // 每次处理的行数
        this.exportNumsByOne = 1000;
        // 输出文件路径
        this.outputUni = `E:/wos-0108-1`;
        // json文件路径（定义了要处理的大学及年份等）
        this.jsonfilepath = '../data/test.json';
    }

    async processBatch1(page, name, year, startRow, endRow) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 模拟成功率 80%
                if (Math.random() < 0.2) resolve(true);
                else reject(new Error("Processing failed"));
            }, 100);
        });
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
            // await this.updateRecord(RECORD_JSON, uniName, year, 0, end - start + 1, 0, end);

            const record = await RecordDao.findRecordByNameAndYear(uniName, year);
            record.successRows += end - start + 1;
            record.end = end;
            await RecordDao.updateById(record.id, record.dataValues);

            // 下载成功后，删除错误日志
            const matchingItem = await FailDao.findByObject({ name: uniName, year: year, start: start, end: end });
            if (matchingItem && matchingItem.errNums < 3) {
                await FailDao.delete(matchingItem.id);
            }
        } catch (error) {
            // if (error instanceof TimeoutError) {
            console.log(`[${this.getTime()}] 下载出错： ${start} to ${end}:`, error);

            // 递归处理，直到处理行数为1，记录日志并重试，错误次数超过3次则跳过
            if (end == start) {
                const matchingItem = await FailDao.findByObject({ name: uniName, year: year, start: start, end: end });
                if (!matchingItem) {
                    const errObj = { 'name': uniName, 'year': year, 'start': start, 'end': end, errNums: 1 };
                    await FailDao.create(errObj);
                } else {
                    if (matchingItem.errNums == 3) {
                        console.log(`[${this.getTime()}] 错误次数超过3次，跳过。`);
                        // 3.超过3次错误，更新处理进度（记录失败的行数，以及处理到哪一行）
                        // await this.updateRecord(RECORD_JSON, uniName, year, 0, 0, end - start + 1, end);
                        const record = await RecordDao.findRecordByNameAndYear(uniName, year);
                        record.failsRows += end - start + 1;
                        record.end = end;
                        await RecordDao.updateById(record.id, record.dataValues);

                        return;
                    } else {
                        matchingItem.errNums++;
                        await FailDao.updateById(matchingItem.id, matchingItem.dataValues);
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
        await sequelize.sync({ force: false });

        const jsonData = await fs.promises.readFile(this.jsonfilepath, 'utf8');
        let data = JSON.parse(jsonData);

        for (const item of data) {
            const { start, end } = item.year.includes('-')
                ? { start: item.year.split('-')[0], end: item.year.split('-')[1] }
                : { start: item.year, end: item.year };

            for (let year = start; year <= end; year++) {
                // 跳过已处理的年份
                const matchingItem = await RecordDao.findRecordByNameAndYear(item.name, year);
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
                if (!matchingItem) {
                    // 1.首次获取总行数，更新到进度文件（进度：成功数，失败数，以及处理到那一行都初始化为0）
                    // await this.updateRecord(RECORD_JSON, item.name, year, allRows, 0, 0, 0);
                    const newRecord = await RecordDao.create({ name: item.name, year: year, rows: allRows, successRows: 0, failsRows: 0, end: 0 });
                    console.log(newRecord);
                }

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

module.exports = WosDownload;
