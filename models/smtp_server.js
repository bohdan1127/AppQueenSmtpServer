const mongoose = require('mongoose');
let smtpServerSchema = new mongoose.Schema({
    host : String,
    port : Number,
    encryption: {
        type: Number, // 0: none 1: SSL 2: TLS
        default: 0,
    },
    name : {
        type: String,
    },
    domain : {
        type: String,
    },
    username : String,
    userpass : String,

    dkim_verified: {
        type: Boolean,
        default: false
    },
    dkim_record: {
        type: String,
        default: ''
    },
    dkim_host_name:{
        type: String,
        default: ''
    },
    dkim_private_key: {
        type: String,
        default: ''
    },
    daily_count:{
        type: Number,
        default: 0
    },
    monthly_count:{
        type: Number,
        default: 0
    },
    is_trial : {
        type: Boolean,
        default: false
    },
    sent_count: {
        type: Number,
        default: 0
    },
    status: {
        type: Boolean,
        default: false
    }
});
module.exports = mongoose.model('SmtpServer', smtpServerSchema);