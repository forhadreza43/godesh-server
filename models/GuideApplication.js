import { getDB } from "../config/database.js";

class GuideApplication {
  static collection() {
    return getDB().collection("guideApplications");
  }

  static async findOne(filter) {
    return await this.collection().findOne(filter);
  }

  static async find(filter = {}, options = {}) {
    const { skip = 0, limit = 0, sort = {} } = options;
    let query = this.collection().find(filter);
    
    if (Object.keys(sort).length > 0) {
      query = query.sort(sort);
    }
    if (skip > 0) query = query.skip(skip);
    if (limit > 0) query = query.limit(limit);
    
    return await query.toArray();
  }

  static async countDocuments(filter = {}) {
    return await this.collection().countDocuments(filter);
  }

  static async insertOne(doc) {
    return await this.collection().insertOne(doc);
  }

  static async updateOne(filter, update) {
    return await this.collection().updateOne(filter, update);
  }

  static async deleteOne(filter) {
    return await this.collection().deleteOne(filter);
  }
}

export default GuideApplication;
