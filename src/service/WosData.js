const WosBase = require('./WosBase');
const fs = require('fs');
const xlsx = require('xlsx');
const { sleep, getRandomMs, isNotDirEmpty } = require('../utils/utils');

class WosData extends WosBase {
    // 构造函数
    constructor() {
        super();
        //每次处理的行数
        this.exportNumsByOne = 100;
        //输出文件路径
        this.outputUni = `E:/wos-0108-1`;
        //json文件路径（定义了要处理的大学及年份等）
        this.jsonfilepath = 'WosDataNums.json';
    }

    async process(page, expFails = false) {
        const jsonData = await fs.promises.readFile(this.jsonfilepath, 'utf8');
        let data = JSON.parse(jsonData);

        console.log('本次要处理的总数:', data.length);
        if (!expFails)
            console.log('本次不处理失败的数据');

        //遍历data数据，逐条处理
        for (const item of data) {
            // 计算要处理的次数(计算结果为-1则认为是第一次处理，此时尚不知道总行数)
            let expCount = this.getExpCount(item);

            // 如果指定为不处理上次失败的数据，则跳过
            if (!expFails) {
                if (item.fails.length != 0 && item.success.length + item.fails.length == expCount) {
                    console.log(`标记为不处理上次错误的数据，跳过: ${item.name} - ${item.year}年`);
                    continue;
                }
            }

            // 如果已经处理完（所有都成功），则跳过
            if (item.success && item.success.length == expCount) {
                console.log(`已标记为处理完，跳过: ${item.name} - ${item.year}年`);
                continue;
            }

            console.log(`处理开始: ${item.name} - ${item.year}年`);

            // 设定筛选条件
            await this.setFilterNameAndYear(page, item.name, item.year);
            await sleep(() => getRandomMs(3000, 3500));

            // 获取总行数（进第一次，且未指定总行数时执行）
            if (item.success.length == 0 && item.fails.length == 0) {
                const newCount = await this.getCountByNameAndYear(page);

                // 如果总行数发生变化，重新计算处理次数，并设定结束行号和总行数
                if (newCount != item.rows) {
                    if (item.rows == item.end) {
                        item.end = newCount;
                    }
                    //结束行修正
                    if (item.end > newCount) {
                        item.end = newCount;
                    }
                    //总行数修正
                    item.rows = newCount;
                    expCount = Math.ceil((item.end - item.start + 1) / this.exportNumsByOne);
                }
                await this.updateJsonFile(this.jsonfilepath, data);
            }

            // 此时已经知道总行数，可以计算要处理的次数
            if (expCount == -1) {
                expCount = Math.ceil(item.rows / this.exportNumsByOne);
            }

            //大学名
            const name = item.name;
            //年份
            const year = item.year;

            for (let i = 0; i < expCount; i++) {
                let startRow = (i * this.exportNumsByOne) + 1 + (item.start ? item.start - 1 : 0);
                let endRow = (i == (expCount - 1)) ? item.end : (i + 1) * this.exportNumsByOne + (item.start ? item.start - 1 : 0);

                if (item.success.includes(i + 1)) {
                    console.log(`已标记为处理完，跳过: ${name} - ${year}年  第${startRow}~${endRow}行`);
                    continue;
                }

                if (!expFails && item.fails.includes(i + 1)) {
                    console.log(`已标记为错误，跳过: ${name} - ${year}年  第${startRow}~${endRow}行`);
                    continue;
                }

                console.log(`[${this.getTime()}] 处理开始: ${name} - ${year}年 第${startRow}~${endRow}行`);
                const downPath = `${this.outputUni}/${name}/${year}/${i + 1}`;
                await this.createDirs(`${downPath}`);
                await this.setDownDir(page, `${downPath}`);
                await this.pullData(page, name, year, startRow, endRow);
                const downTrue = await isNotDirEmpty(`${downPath}`, 150);
                if (downTrue) {
                    console.log(`[${this.getTime()}] 处理完成: ${name} - ${year}年  第${startRow}~${endRow}行`);
                    const downWin = await page.$('app-input-route:nth-of-type(2) span.mat-button-wrapper > span');
                    if (downWin) {
                        await downWin.click();
                    }
                    //更新状态
                    if (!item.success.includes(i + 1)) {
                        item.success.push(i + 1);

                        // 如果处理成功，则从失败数组中删除
                        if (item.fails.includes(i + 1)) {
                            item.fails.splice(item.fails.indexOf(i + 1), 1);
                        }
                    }
                    await this.updateJsonFile(this.jsonfilepath, data);
                } else {
                    // 超时则关闭导出窗口
                    await page.locator('app-input-route:nth-of-type(2) span.mat-button-wrapper > span').click();
                    if (!item.fails.includes(i + 1)) {
                        item.fails.push(i + 1);
                    }
                    await this.updateJsonFile(this.jsonfilepath, data);
                    console.log(`超时，继续处理下一个`);
                }
            }
            console.log(`处理完成: ${name} - ${year}年`);
        }

    }

    /**
     * 计算要处理的次数
     * @param {item} item 
     * @returns 处理次数
     */
    getExpCount(item) {
        let expCount = 0;
        if (item.start && item.end) {
            const count = item.end - item.start + 1;
            expCount = Math.ceil(count / this.exportNumsByOne);
        } else if (item.rows) {
            expCount = Math.ceil(item.rows / this.exportNumsByOne);
        } else {
            expCount = -1;
        }
        return expCount;
    }
}

module.exports = WosData;
