let mongoose = require('mongoose');
const Schema = mongoose.Schema;
let redirectSchema = new mongoose.Schema({
    userid : {
        type: Schema.Types.ObjectId,
        ref:'User'
    },
    emailid : {
        type: Schema.Types.ObjectId,
        ref:'Email'
    },
    url: {
        type: String,
        default:'',
    },
    text: String

});
module.exports = mongoose.model('Redirect', redirectSchema);