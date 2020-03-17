let mongoose = require('mongoose');
const Schema = mongoose.Schema;
let emailSchema = new mongoose.Schema({
    userid: {
        type: Schema.Types.ObjectId,
        ref:'User',
        unique: false
    },
    from : {
        address : String,
        name : String,
    },
    date : String,
    recv_message_id: String,
    mime_version : String,
    subject : String,
    content_type: String,
    html : {
        type: Boolean,
        default: false
    },
    body : String,
    body_html : String,
    html_content: String,
    log : {
        type: String,
        default: "",
    },
    receive_date: Date,
    my_sent_date : Date,
    my_sent_success_date : Date,
    message_id : String,
    attachments:[{
        content_type: String,
        partid : String,
        filename :String,
        content : Buffer,
        contentDisposition: String
        }
    ],
    sent : {
        type:Number, //0: did not send   1 : sent , 2: bounce,
        // 3: failed to send on my side 4: no external server 5: did not sent because hourly limited 6: did not sent because daily limited
        default: 0
    },
    flag: {
        type: Number, // 0: should send 1: should send too 2: failed to send
        default: 0
    },
    sending_flag: {
        type: Number,
        default: 0,
    },
    track_code: {
        type: String,
        default: ''
    },
    open_status: {
        type: Number,
        default: 0,
    },

    click_status:{
        type: Number,
        default: 0
    },
    bounce_status: {
        type: Number,
        default: 0
    },
    unsubscribe_status:{
        type: Number,
        default: 0
    },
    report_status: {
        type: Number,
        default: 0
    },
    spf_status: {
        type: Number,
        default: 0
    },
    review_status: {
        type: Number, //0 : active, 1: review
        default: 0,
    },
    log_email_id:{
        type: Schema.Types.ObjectId,
        ref:'LogEmail',
    },
    checked_review_status:{
        type: Number,
        default: 0
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});
emailSchema.virtual('destaddr', {
    ref : 'Emailto',
    localField: '_id',
    foreignField: 'emailid',
    justOne: false
});

// emailSchema.virtual('dest').get(function(){
//     return 'aaaa';
// });
module.exports = mongoose.model('Email', emailSchema);