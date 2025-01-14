const { DataTypes, Model } = require('sequelize');
const sequelize = require('../index');

class Record extends Model {

}

Record.init({
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
  rows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  successRows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  failsRows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  end: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  sequelize,
  tableName: 'records',
  modelName: 'Record'
});

module.exports = Record;