var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var domainSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    email:{
        type: String,
        default: "",
    }

});
module.exports = mongoose.model('Unsubscribe', domainSchema);