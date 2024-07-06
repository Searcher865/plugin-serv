const parentKeyModel = require("../models/parentKey-model")

class FindParent {
  async getparentKeyIdByParentKey(parentKey) {
    try {
      const parentKeyFinal = await parentKeyModel.findOne({ parentKey }).exec();
      if (!parentKeyFinal) {
        throw new Error('parentKey not found!');
      }
      return parentKeyFinal._id;
    } catch (error) {
      console.error(error);
      throw new Error('Something went wrong while fetching parent task ID!');
    }
  }
}

module.exports = new FindParent ();