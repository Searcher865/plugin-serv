const mongoose = require('mongoose');
const {Schema, model} = require('mongoose');


const BugSchema = new Schema({
  project: { type: String, required: true },
  pageId: { type: mongoose.Schema.Types.ObjectId, required: true },
  xpath: { type: String},
  heightRatio: { type: Number},
  widthRatio: { type: Number},
  bugNumber: { type: Number},
  taskId: { type: String },
  taskKey: {type: String},
  parentKey: { type: mongoose.Schema.Types.ObjectId },
  summary: {type: String},
  finalOsVersion: {type: String},
  browser: {type: String},
  pageResolution: {type: String},
  status: {type: String},
  createdAt: {type: String},
  author: {type: String}
});

module.exports = model('Bug', BugSchema)