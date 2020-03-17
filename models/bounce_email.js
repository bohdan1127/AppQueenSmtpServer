var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var domainSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    smtpserver_id: {
        type: Schema.Types.ObjectID,
        ref: 'SmtpServer'
    },

    email_id : {
        type : String,
        default: ""
    },

    email_pwd : {
        type: String,
        default: "",
    },
    domain: {
        type: String,
        default: "",
    },
    total_count : {
        type: Number,
        default: 0
    },
    daily_count:{
        type: Number,
        default: 0
    },
    updatedDate: {
        type: Date
    }

});
module.exports = mongoose.model('BounceEmail', domainSchema);