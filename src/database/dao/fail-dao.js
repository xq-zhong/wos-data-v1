const { Fail } = require('../models');
const BaseDao = require('./base-dao');

class FailDao extends BaseDao {
    constructor() {
        super(Fail);
    }

    async findFailByNameAndYear(name, year) {
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

module.exports = new FailDao();