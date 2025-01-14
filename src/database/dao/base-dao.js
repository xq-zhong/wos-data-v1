class BaseDao {
    constructor(model) {
        this.model = model;
    }

    async create(data) {
        return await this.model.create(data);
    }

    async findById(id) {
        return await this.model.findByPk(id);
    }

    async findAll(options = {}) {
        return await this.model.findAll(options);
    }

    async findByObject(queryObject) {
        const whereClause = {};
        for (const key in queryObject) {
            if (queryObject.hasOwnProperty(key)) {
                whereClause[key] = queryObject[key];
            }
        }
        return this.findOne({ where: whereClause });
    }

    async updateById(id, updateData) {
        const instance = await this.model.findByPk(id);
        if (!instance) {
            return null;
        }
        await instance.update(updateData);
        return instance;
    }

    async delete(id) {
        const instance = await this.model.findByPk(id);
        if (!instance) {
            return false;
        }
        await instance.destroy();
        return true;
    }
    async findOne(options = {}) {
        return await this.model.findOne(options);
    }
}

module.exports = BaseDao;