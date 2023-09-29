const {Schema, model} = require('mongoose');

const DomainSchema = new Schema({
  name: { type: String, required: true },
});

module.exports = model('Domain', DomainSchema)