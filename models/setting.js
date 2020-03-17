var mongoose = require('mongoose');
var settingSchema = new mongoose.Schema({
    open_limit_rate:{
        type:Number,
        default: 100
    },
    click_limit_rate:{
        type:Number,
        default: 100
    },
    bounce_limit_rate:{
        type: Number,
        default: 100
    },

    unsubscribe_limit_rate:{
        type: Number,
        default: 100
    },
    new_send_count:{
        type: Number,
        default: 50
    },
    emails_per_second: {
        type: Number,
        default: 1
    },
    send_open_link:{
        type: Boolean,
        default: false
    },
    send_click_link:{
        type: Boolean,
        default: false
    },
    send_unsubscribe_link:{
        type: Boolean,
        default: false
    }
}
);
module.exports = mongoose.model('Setting', settingSchema);