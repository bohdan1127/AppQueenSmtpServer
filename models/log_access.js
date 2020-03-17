var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var activationSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    mDate: Date,
    ip_address: {
        type: String,
        default: "",
    }
});
module.exports = mongoose.model('LogAccess', activationSchema);