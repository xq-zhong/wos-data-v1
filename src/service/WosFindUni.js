const WosBase = require('./WosBase');
const fs = require('fs');
const xlsx = require('xlsx');
const { sleep, getRandomMs, isNotDirEmpty } = require('../utils/utils');

class WosFindUni extends WosBase {
    // 构造函数
    constructor() {
        super();
        //每次处理的行数
        this.exportNumsByOne = 100;
        //输出文件路径
        this.outputUni = `E:/wos-0110`;
        //json文件路径（定义了要处理的大学及年份等）
        this.jsonfilepath = 'uni-diff.json';
        this.isCheckUni = true;
    }

    async process(page, expFails = false) {

        // 读取json文件
        const jsonData = JSON.parse(fs.readFileSync(this.jsonfilepath, 'utf8'));
        let result = [];

        for (let item of jsonData) {
            if (item.rows && item.rows >= 0)
                continue;

            // 设定筛选条件
            await this.setFilterNameAndYear(page, item.name, '2015-2024');
            await sleep(() => getRandomMs(3000, 3500));

            let newCount = await this.getCountByNameAndYear(page);

            item.rows = newCount;

            await this.updateJsonFile(this.jsonfilepath, jsonData);

            if (newCount = 0) {
                result.push({
                    name: item.name,
                    source: item.source
                });
            }
        }

        //将result写入json文件
        fs.writeFileSync(`${this.outputUni}/uni-diff-fails.json`, JSON.stringify(result, null, 2));

        //将result写入excel
        const ws = xlsx.utils.json_to_sheet(result);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'result');
        xlsx.writeFile(wb, `${this.outputUni}/result.xlsx`);
    }
}



module.exports = WosFindUni;