const {Schema, model} = require('mongoose');
const schema = new Schema({
    items: {type: Array, default: null}
});

module.exports = model('allMoviesID', schema);