const mongoose = require('mongoose');
const {Schema, model} = require('mongoose');


const ProjectsSchema = new Schema({
  name: { type: String, required: true },
  domains: [{ type: String, required: true }]
});

module.exports = model('Projects', ProjectsSchema)