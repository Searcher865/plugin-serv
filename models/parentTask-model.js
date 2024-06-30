const mongoose = require('mongoose');
const {Schema, model} = require('mongoose');


const ParentTaskSchema = new Schema({
  parentKey: { type: String, required: true, unique: true },
});

module.exports = model('parentTask', ParentTaskSchema)