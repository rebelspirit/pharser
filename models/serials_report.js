const {Schema, model} = require('mongoose');

const schema = new Schema({
    date: {type: String, default: Date()},
    success_download: {type: Number, default: 0},
    missed_download: {type: Number, default: 0},
    total: {type: Number, default: 0}
});

module.exports = model('serials_report', schema);