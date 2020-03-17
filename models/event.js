var mongoose = require('mongoose');
var eventSchema = new mongoose.Schema({
    type : {
        type: String,
        default: '',
    },
    subtype:{
        type: String,
        default: ''
    },
    data : {
        type: String,
        default: ''
    }
});
module.exports = mongoose.model('Event', eventSchema);