var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var userSmtpSchema = new mongoose.Schema({
    userid : {
        type: Schema.Types.ObjectId,
        ref:'User'
    },
    smtpserver_id : {
        type: Schema.Types.ObjectId,
        ref:'SmtpServer'
    }
});
module.exports = mongoose.model('Usersmtp', userSmtpSchema);