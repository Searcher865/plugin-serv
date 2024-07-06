const mongoose = require('mongoose');
const {Schema, model} = require('mongoose');


const parentKeySchema = new Schema({
  parentKey: { type: String, required: true, unique: true },
});

module.exports = model('parentKey', parentKeySchema)