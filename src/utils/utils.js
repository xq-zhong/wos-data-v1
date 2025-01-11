const fs = require('fs');
const path = require('path');
const https = require('https');

function sleep(getRandomMsFunc) {
    const random_ms = getRandomMsFunc();
    // console.log(`wait for ${random_ms / 1000} seconds`);
    return new Promise(resolve => setTimeout(resolve, random_ms));
}

function getRandomMs(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return (Math.floor(Math.random() * (max - min + 1)) + min);
}

async function updateJsonFile(filePath, jsonData) {
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
        // console.log('文件已更新');
    } catch (err) {
        console.log('更新文件失败:', err);
        throw error;
    }
}

async function createDirs(dirPath) {
    const fullPath = path.resolve(__dirname, dirPath);

    try {
        fs.mkdirSync(fullPath, { recursive: true });
        // console.log(`目录已创建或已存在：${fullPath}`);
    } catch (error) {
        console.error('创建目录时发生错误:', dirPath, error);
        throw error;
    }
}

function isOnline(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            resolve(res.statusCode === 200);
        }).on('error', (err) => {
            reject(false);
        });
    });
}

const isProcessed = (year, jsonData) => {
    if (Object.keys(jsonData).length === 0) {
        return false;
    }

    const years = Object.keys(jsonData);
    const lastYear = Math.max(...years.map(year => parseInt(year)));

    if (lastYear < year) {
        return false;
    }

    const rows = jsonData[lastYear].rows;
    const done = jsonData[lastYear].done;

    return (Math.ceil(rows / 1000) == done);
}

// 获取未处理的数据
async function getEmpData(basePath = './wos') {
    const dirs = fs.readdirSync(basePath);
    const emptyDirs = [];
    for (const dir of dirs) {
        const years = fs.readdirSync(path.join(basePath, dir));
        for (const year of years) {
            const nums = fs.readdirSync(path.join(basePath, dir, year));
            for (const num of nums) {
                const files = fs.readdirSync(path.join(basePath, dir, year, num));
                if (files.length === 0) {
                    emptyDirs.push(path.join(basePath, dir, year, num));
                }
            }
        }
    }

    const result = [];

    for (const dir of emptyDirs) {
        const parts = dir.split(path.sep);
        const num = parts.pop();
        const year = parts.pop();
        const name = parts.pop();
        result.push({ name, year, num, start: (num - 1) * 1000 + 1, end: num * 1000 });
    }

    return result;
}

function getEmpDataUni(basePath = './wos') {
    const dirs = fs.readdirSync(basePath);
    const result = [];
    for (const dir of dirs) {
        const files = fs.readdirSync(path.join(basePath, dir));
        if (files.length === 0) {
            result.push(dir);
        }
    }

    return result;
}

async function getEmpUni(basePath = './uni') {
    let result = [];
    const files = fs.readdirSync(inputUni);
    const jsonFiles = files.filter(file => file.startsWith('uni') && file.endsWith('.json'));
    jsonFiles.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
    });

    for (let i = 0; i < jsonFiles.length; i++) {
        const fileName = jsonFiles[i];
        const filePath = path.join(inputUni, fileName);

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        for (let j = 0; j < data.length; j++) {
            if (Object.keys(data[j].rows_by_year).length === 0) {
                result.push({ name: data[j].name, year: data[j].year });
            } else {
                for (const year in data[j].rows_by_year) {
                    if (data[j].rows_by_year[year].rows === -1) {
                        result.push({ name: data[j].name, year: parseInt(year) });
                    }
                }
            }
        }
    }

    return result;
}

async function isNotDirEmpty(dirPath, pCount = 100) {
    let count = 0;
    while (true) {
        const files = fs.readdirSync(dirPath);
        if (files.length > 0) {
            return true;
        }

        if (count > pCount) {
            return false;
        }

        count++;
        await sleep(() => getRandomMs(300, 500));
    }
}

function getFormattedTime() {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString(undefined, { hour12: false });
    const ms = now.getMilliseconds();
    return `${date} ${time}.${ms.toString().padStart(3, '0')}`;
}

//找出文件夹创建时间和文件创建时间不是同一天的路径
// 目录结构如下
// F:/wos/nama/year/num
// 先要找出文件夹num和其中的文件的创建时间不一致的，将对应的完整路径（F:/wos/name/year/num）返回
// 例如：F:/wos/nama/2021/1，如果文件夹1的创建时间和其中的文件的创建时间不一致，就将F:/wos/nama/2021/1返回
function findDirNotSameDay(basePath = 'E:/wos') {
    const dirs = fs.readdirSync(basePath);
    const result = [];
    for (const dir of dirs) {
        const years = fs.readdirSync(path.join(basePath, dir));
        for (const year of years) {
            const nums = fs.readdirSync(path.join(basePath, dir, year));
            for (const num of nums) {
                const dirPath = path.join(basePath, dir, year, num);
                const dirStat = fs.statSync(dirPath);
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    const fileStat = fs.statSync(filePath);
                    if (dirStat.birthtime.toDateString() !== fileStat.mtime.toDateString()) {
                        const formattedDirTime = dirStat.birthtime.toLocaleString();
                        const formattedFileTime = fileStat.mtime.toLocaleString();
                        result.push({
                            dirPath,
                            dirCreationTime: formattedDirTime,
                            filePath,
                            fileModificationTime: formattedFileTime
                        });
                        break;
                    }
                }
            }
        }
    }

    return result;
}
function getDiffByDirs(path1, path2) {
    const result = [];
    const dirs1 = fs.readdirSync(path1);

    for (const dir of dirs1) {
        const years1 = fs.readdirSync(path.join(path1, dir));
        const years2 = fs.existsSync(path.join(path2, dir)) ? fs.readdirSync(path.join(path2, dir)) : [];

        for (const year of years1) {
            const nums1 = fs.readdirSync(path.join(path1, dir, year));
            const nums2 = fs.existsSync(path.join(path2, dir, year)) ? fs.readdirSync(path.join(path2, dir, year)) : [];

            for (const num of nums1) {
                if (!nums2.includes(num)) {
                    result.push({ university: dir, year: year, num: num });
                }
            }
        }
    }

    return result;
}
function getFileDiffByDirs(path1, path2) {
    const result = {
        onlyInPath1: [],
        onlyInPath2: []
    };
    const dirs1 = fs.readdirSync(path1);

    for (const dir of dirs1) {
        const years1 = fs.readdirSync(path.join(path1, dir));
        const years2 = fs.existsSync(path.join(path2, dir)) ? fs.readdirSync(path.join(path2, dir)) : [];

        for (const year of years1) {
            if (!years2.includes(year)) {
                continue;
            }

            const nums1 = fs.readdirSync(path.join(path1, dir, year));
            const nums2 = fs.existsSync(path.join(path2, dir, year)) ? fs.readdirSync(path.join(path2, dir, year)) : [];

            for (const num of nums1) {
                const files1 = fs.existsSync(path.join(path1, dir, year, num)) ? fs.readdirSync(path.join(path1, dir, year, num)) : [];
                const files2 = fs.existsSync(path.join(path2, dir, year, num)) ? fs.readdirSync(path.join(path2, dir, year, num)) : [];

                if (files1.length > 0 && files2.length === 0) {
                    result.onlyInPath1.push({ university: dir, year: year, num: num });
                } else if (files1.length === 0 && files2.length > 0) {
                    result.onlyInPath2.push({ university: dir, year: year, num: num });
                }
            }
        }
    }

    return result;
}

function getDirByYear(p) {
    const result = [];
    const dirs = fs.readdirSync(p);

    for (const dir of dirs) {
        const years = fs.readdirSync(path.join(p, dir));
        for (const year of years) {
            result.push({ university: dir, year: year });
        }
    }


    return result;
}

function deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`Directory "${dirPath}" has been deleted.`);
    } else {
        console.log(`Directory "${dirPath}" does not exist.`);
    }
}

// {
//     "name": "Harvard University",
//     "year": "2021",
//     "start": 37001,
//     "end": 38000,
//     "success": [],
//     "fails": [],
//     "rows": 38082
// }
function getFailsRowNumByCount(jsonFile, count) {
    let result = [];
    const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    for (const item of jsonData) {
        if (item.fails.length > 0) {
            for (const fail of item.fails) {
                const s = (fail - 1) * count + 1 + item.start;
                const e = (fail * count + item.start) > item.rows ? item.rows : fail * count + item.start;
                result.push({
                    name: item.name,
                    year: item.year,
                    start: s,
                    end: e,
                    rows: item.rows,
                    success: [],
                    fails: [],
                    failsRows: e - s
                });
            }
        }
    }

    return result;
}

// 导出模块
module.exports = {
    sleep,
    getRandomMs,
    updateJsonFile,
    createDirs,
    isOnline,
    isProcessed,
    getEmpData,
    getEmpUni,
    isNotDirEmpty,
    getFormattedTime,
    findDirNotSameDay,
    getDiffByDirs,
    getFileDiffByDirs,
    getDirByYear,
    deleteDirectory,
    getFailsRowNumByCount
};
