const {Schema, model} = require('mongoose');

const UserSchema = new Schema({
    email: {type: String, unique:true, require:true},
    password: {type: String, require: true},
    trackerID:{type: String},
    parentKeyForForm: { type: [String], default: [] },
    isActivated:{ type:Boolean, default: false},
    activationLink:{type: String}
})

module.exports = model('User', UserSchema)