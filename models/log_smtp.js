var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var logSmtpSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    emailid: {
        type: Schema.Types.ObjectId,
        ref:'Email',
        unique: false
    },
    smtpid: {
        type: Schema.Types.ObjectId,
        ref:'SmtpServer',
        unique: false
    },
    sent_date: Date,
});
module.exports = mongoose.model('LogSmtp', logSmtpSchema);