var mongoose = require('mongoose');
var activationSchema = new mongoose.Schema({
    userid: String,
    activeToken: String,
    activeExpires : Date,
});
module.exports = mongoose.model('Activation', activationSchema);