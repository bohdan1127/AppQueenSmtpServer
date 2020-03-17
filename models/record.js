var mongoose = require('mongoose');
var recordSchema = new mongoose.Schema({
    name : String
});
module.exports = mongoose.model('Record', recordSchema);