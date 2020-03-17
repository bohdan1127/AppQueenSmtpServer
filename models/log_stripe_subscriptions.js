var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var logStripeSubscriptionSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    mDate: Date,
    subscription_id:
    {
        type: String,

    },
    status:{
        type: Number,
        default: 0
    }

});
module.exports = mongoose.model('LogStripeSubscription', logStripeSubscriptionSchema);