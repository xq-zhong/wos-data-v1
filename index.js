const WosDataNums = require('./WosData');

const obj = new WosData();
obj.run().then(() => {
    console.log('处理完成');
}).catch(err => {
    console.log("Error:", err);
});