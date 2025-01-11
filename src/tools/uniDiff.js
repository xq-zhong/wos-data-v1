const fs = require('fs');
const xlsx = require('xlsx');

const qs = './uni/qs.json';
const rank = './uni/rank.json';

const the = './uni/the.txt';
const usnew = './uni/usnews.txt';

function getUniByFile(f) {
    //读取json文件，返回对象
    let data = fs.readFileSync(f, 'utf8');
    let obj = JSON.parse(data);
    return obj;
}


function getUniByTxt(f) {
    //读取txt文件，返回数组
    let data = fs.readFileSync(f, 'utf8');
    let arr = data.split('\r\n');
    return arr;
}


function diff_the(arrUsnews) {
    const objThe = getUniByTxt(the);
    let result = [];
    for (const item of objThe) {
        if (!arrUsnews.includes(item)) {
            result.push(item);
        }
    }
    return result;
}

function diff_qs(arrUsnews) {
    const objQs = getUniByFile(qs);
    let result = [];
    for (const item of objQs) {
        if (!arrUsnews.includes(item.enName)) {
            result.push({ cnName: item.cnName, enName: item.enName });
        }
    }
    return result;
}

function diff_rank(arrUsnews) {
    const objRank = getUniByFile(rank);
    let result = [];
    for (const item of objRank) {
        if (!arrUsnews.includes(item.enName)) {
            result.push({ cnName: item.cnName, enName: item.enName });
        }
    }
    return result;
}

function main() {
    // let result_qs_rank = dif_qs_and_rank();
    // console.log(result_qs_rank.length);


    const arrUsnews = getUniByTxt(usnew);
    const arrThe = getUniByTxt(the);
    const arrQs = getUniByFile(qs);
    const arrRank = getUniByFile(rank);

    //将arrUsnews,arrThe,arrQs,arrRank合并(其中arrQS和arrRank是数组对象，需要取出其中的enName进行合并)，然后去重，之后从去重的结果中删除usnews中的元素
    // 假设 arrUsnews, arrThe, arrQs, arrRank 是包含大学名称的数组
    // arrQs 和 arrRank 中的每个元素是一个对象，包含 enName 属性

    // 将每个数组中的大学名称和来源组织成对象数组
    const arrUsnewsWithSource = arrUsnews.map(item => ({ name: item, source: 'usnews' }));
    const arrTheWithSource = arrThe.map(item => ({ name: item, source: 'the' }));
    const arrQsWithSource = arrQs.map(item => ({ name: item.enName, source: 'qs' }));
    const arrRankWithSource = arrRank.map(item => ({ name: item.enName, source: 'rank' }));

    // 合并所有数组
    const arrAll = arrUsnewsWithSource.concat(arrTheWithSource, arrQsWithSource, arrRankWithSource);

    // 去重，保留来源信息
    const arrAllUnique = arrAll.reduce((acc, curr) => {
        if (!acc.some(item => item.name === curr.name)) {
            acc.push(curr);
        }
        return acc;
    }, []);

    // 过滤出不在 arrUsnews 中的大学
    const arrDiff = arrAllUnique.filter(item => !arrUsnews.includes(item.name));

    console.log(arrAll.length); // 合并后的总数量
    console.log(arrAllUnique.length); // 去重后的数量

    console.log(arrDiff.length); // 不在 arrUsnews 中的大学数量
    console.log(arrDiff); // 不在 arrUsnews 中的大学列表，包含来源信息

    //将arrDiff写入json文件
    const jsonStr = JSON.stringify(arrDiff, null, 2);
    fs.writeFileSync('./uni/uni-diff.json', jsonStr, 'utf8');
}

function dif_qs_and_rank() {
    let result = [];

    //将qs和rank先合并，然后用cnname去重
    const objQs = getUniByFile(qs);
    const objRank = getUniByFile(rank);
    const objQsRank = objQs.concat(objRank);
    const objQsRankCnName = {};
    for (const item of objQsRank) {
        objQsRankCnName[item.cnName] = item;
    }
    const objQsRankCnNameArr = Object.values(objQsRankCnName);

    return objQsRankCnNameArr;
}


function strDiff(str1, str2) {
    //替换掉字符串中的字符（'''，'’'，',','，'），并统一转为小写进行比较
    // str1 = str1.replace(/['’‘,，]/g, '').toLowerCase();
    // str2 = str2.replace(/['’‘,，]/g, '').toLowerCase();
    return str1 == str2;
}


function test() {
    let data = fs.readFileSync('uni/uni-diff.json', 'utf8');
    let obj = JSON.parse(data);

    console.log(obj.length);

    let result = [];
    let result_has = [];
    for (const item of obj) {
        if (item.rows <= 0) {
            result.push(item);
        } else {
            result_has.push(item);
        }
    }

    createExcel(result_has, 'uni-diff.xlsx');
    createExcel(result, 'uni-diff-not-exist.xlsx');
}

test();

function createExcel(result, filename) {
    const ws = xlsx.utils.json_to_sheet(result);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'result');
    xlsx.writeFile(wb, `uni/${filename}`);
}
