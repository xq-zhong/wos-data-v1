// const WosData = require('./src/WosData');
const WosData = require('./service/WosDataRecursion');
const sequelize = require('./database');

function main() {
    // sequelize.sync({force: true}).then(() => {
    //     console.log('数据库同步完成');
    // })

    const obj = new WosData();
    obj.run().then(() => {
        console.log('处理完成');
    }).catch(err => {
        console.log("Error:", err);
    });
}

main();