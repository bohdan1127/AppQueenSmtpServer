var mongoose = require('mongoose');
var stripeSchema = new mongoose.Schema({
    user_id : {
        type: String,
        default: '',
    },
    stripe_token:{
        type: String,
        default: ''
    },
    customer_id : {
        type: String,
        default: ''
    },
    stripe_card:{
        type: String,
        default: ''
    }
});
module.exports = mongoose.model('MStripe', stripeSchema);