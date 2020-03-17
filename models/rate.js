var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var rateSchema = new mongoose.Schema({
    userid : {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    open_rate: {
        type: Number,
        default: 0,
    },

    click_rate:{
        type: Number,
        default: 0
    },
    bounce_rate: {
        type: Number,
        default: 0
    },
    unsubscribe_rate:{
        type: Number,
        default: 0
    },
    report_rate: {
        type: Number,
        default: 0
    },
    updateDate: Date

});
module.exports = mongoose.model('Rate', rateSchema);