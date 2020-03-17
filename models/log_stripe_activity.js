var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var logStripeActivitySchema = new mongoose.Schema({
    userid : {
        type: Schema.Types.ObjectId,
        ref:'User'
    },
    customer_id: {
        type: String,
        default: ""
    },
    activity_type: {
        type : String,
        default: ""
    },
    activity_sub_type:{
        type : String,
        default: ""
    },
    description: String,
    date : Date,

});
module.exports = mongoose.model('LogStripeActivity', logStripeActivitySchema);