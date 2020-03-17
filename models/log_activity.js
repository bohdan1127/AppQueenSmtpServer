var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var logActivitySchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    type : {
        type: Number,
        default: 0
    },
    subtype: {
        type: Number,
        default: 0
    },
    description:{
        type: String,
    },
    date : Date,
    time : Date,
});
module.exports = mongoose.model('LogActivity', logActivitySchema);