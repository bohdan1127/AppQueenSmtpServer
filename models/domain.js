var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var domainSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    type: {
        type: Number,
        default: 0
    },
    email_verified: {
      type :Boolean,
      default: false
    },
    name: String,
    spf_verified : {
        type: Boolean,
        default: false
    },
    dkim_verified : {
        type: Boolean,
        default: false
    },
    txt_will_record : String,
    public_key: String,
    private_key : String,
    dkim_host_name :String,
    dkim_record : String

});
module.exports = mongoose.model('Domain', domainSchema);