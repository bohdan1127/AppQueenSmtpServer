var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var emailToSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    emailid : {
        type: Schema.Types.ObjectId,
        ref:'Email'
    },
    to : {
        address: String,
        name : String
    },

});
module.exports = mongoose.model('Emailto', emailToSchema);