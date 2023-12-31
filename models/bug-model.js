const mongoose = require('mongoose');
const {Schema, model} = require('mongoose');


const BugSchema = new Schema({
  domainId: { type: mongoose.Schema.Types.ObjectId, required: true },
  pageId: { type: mongoose.Schema.Types.ObjectId, required: true },
  xpath: { type: String},
  heightRatio: { type: Number},
  widthRatio: { type: Number},
  bugNumber: { type: Number},
  taskId: { type: String },
  taskKey: {type: String},
  summary: {type: String},
  OSVersion: {type: String},
  browser: {type: String},
  pageResolution: {type: String}
});

module.exports = model('Bug', BugSchema)