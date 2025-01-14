const { Record } = require('../models');
const BaseDao = require('./base-dao');

class RecordDao extends BaseDao {
    constructor() {
        super(Record);
    }

    async findRecordByNameAndYear(name, year) {
        const whereClause = {};
        if (name) {
            whereClause.name = name;
        }
        if (year) {
            whereClause.year = year;
        }
        return this.findOne({ where: whereClause });
    }
}

module.exports = new RecordDao();