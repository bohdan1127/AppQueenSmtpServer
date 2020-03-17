var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var activationSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    updatedDate: {
        type: Date
    },
    count : {
        type: Number,
        default: 1
    }
});
module.exports = mongoose.model('BounceEmailCount', activationSchema);