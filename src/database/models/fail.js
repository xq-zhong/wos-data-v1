const { DataTypes, Model } = require('sequelize');
const sequelize = require('../index');

class Fail extends Model {

}

Fail.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false
  },
  start: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  end: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  errNums: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
}, {
  sequelize,
  tableName: 'fails',
  modelName: 'Fail'
});

module.exports = Fail;