var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var logEmailSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    email_body : {
        type: String,
        default: "",
    },
    email_subject: {
        type: String,
        default: "",
    },
    email_same_count: {
        type: Number,
        default: 0
    },
    status: {
        type: Number, //1 : review 0 : can send
        default: 0
    },
    emailid: {
        type: Schema.Types.ObjectId,
        ref:'Email',
        unique: false
    },
});
module.exports = mongoose.model('LogEmail', logEmailSchema);