const mongoose = require('mongoose');
const {Schema, model} = require('mongoose');

const PageSchema = new Schema({
  path: { type: String, default: null },
  project: { type: String },
  // domainId: { type: mongoose.Schema.Types.ObjectId, required: true },
});

module.exports = model('Page', PageSchema)