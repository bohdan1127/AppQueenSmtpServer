var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var countSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    total_count: {
        type:Number,
        default: 0
    },
    sent_count :{
        type : Number,
        default: 0
    },

    activeExpires : Date,
});
module.exports = mongoose.model('Count', countSchema);