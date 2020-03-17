var mongoose = require('mongoose');
var sendDomainSchema = new mongoose.Schema({
    name : String
});
module.exports = mongoose.model('SendDomain', sendDomainSchema);