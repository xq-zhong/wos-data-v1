// const WosData = require('./src/WosData');
const WosData = require('./service/WosDataRecursion');

const obj = new WosData();
obj.run().then(() => {
    console.log('处理完成');
}).catch(err => {
    console.log("Error:", err);
});