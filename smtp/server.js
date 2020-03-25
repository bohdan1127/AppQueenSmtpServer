// Replace '../lib/smtp-server' with 'smtp-server' when running this script outside this directory
//const SMTPServer = require('../lib/smtp-server').SMTPServer;

const SMTPServer = require('smtp-server').SMTPServer;
const SERVER_HOST = false;
const nodemailer = require('nodemailer');
let fs = require('fs');
let SendDomain = require('../models/senddomain');
let User = require('../models/user');
let Redirect = require('../models/redirect');
let Email = require('./../models/email');
let Domain = require('./../models/domain');
let Count = require('./../models/count');
let Emailto = require('./../models/emailto');
let LogSmtp = require('../models/log_smtp');
let SmtpServer = require('../models/smtp_server');
let Setting = require('../models/setting');
let Secrets = require('../config/secrets');
let Usersmtp = require('../models/usersmtp');
let Unsubscribe = require('../models/unsubscribe');

const EmailValidator = require('email-deep-validator');
let simpleParser = require('mailparser').simpleParser;
const { to , ReE , ReS} = require('./../utils/util');
const emailValidator = new EmailValidator();

let emailCheck = require('email-check');

let cheerio = require("cheerio");
// Connect to this example server by running
//   telnet localhost 2525
// or
//   nc -c localhost 2525

// Authenticate with this command (username is 'testuser' and password is 'testpass')
//   AUTH PLAIN dGVzdHVzZXIAdGVzdHVzZXIAdGVzdHBhc3M=
// Setup server
const server = new SMTPServer({
    // log to console
    logger: true,

    secure: true,
    key: fs.readFileSync("cert.key"),
    cert: fs.readFileSync("app_queensmtp_com.crt"),
    
    // not required but nice-to-have
    banner: 'Welcome to My Awesome SMTP Server',

    // disable STARTTLS to allow authentication in clear text mode
    //disabledCommands: ['AUTH', 'STARTTLS'],

    // By default only PLAIN and LOGIN are enabled
    authMethods: ['PLAIN', 'LOGIN', 'CRAM-MD5'],

    // Accept messages up to 10 MB
    size: 10 * 1024 * 1024,

    // allow overriding connection properties. Only makes sense behind proxy
    useXClient: true,

    hidePIPELINING: true,

    // use logging of proxied client data. Only makes sense behind proxy
    useXForward: true,

    // Setup authentication
    // Allow only users with username 'testuser' and password 'testpass'
    async onAuth(auth, session, callback) {
        let err, user;
        [err, user] = await to (User.findOne({'smtp_username': auth.username}));

        console.log(auth.username);

        if (err){
            return callback(new Error('Authentication Failed to get user info'));
        }
        // check username and password
        if (user){
            if (user.role == 0)
            {

            }
            else if (user.role == 1){

            }
            if (auth.method === 'CRAM-MD5'
                ? auth.validatePassword(user.smtp_userpass) // if cram-md5, validate challenge response
                : auth.password === user.smtp_userpass) // for other methods match plaintext passwords
            {
                console.log('password is correct');
                if (user.activate){
                    return callback(null, {
                        user: user // value could be an user id, or an user object etc. This value can be accessed from session.user afterwards
                    });
                }
                else
                {
                    return callback(new Error('User not activated.'));
                }
                if (user.status == 2){ //check user status is suspended
                    return callback(new Error('This user is suspended.'));
                }
            }
            else {
                console.log('password is incorrect');
                return callback(new Error('Authentication Failed.User password is not correct.'));
            }
        }
        else
        {
            return callback(new Error('Authentication Failed.This User does not exist.'));
        }
    },

    // Validate MAIL FROM envelope address. Example allows all addresses that do not start with 'deny'
    // If this method is not set, all addresses are allowed
    async onMailFrom(address, session, callback) {
        // if (/^deny/i.test(address.address)) {
        //     return callback(new Error('Not accepted'));
        // }
        let domain = getDomainFromEmail(address.address);
        let err, verified_domains;
        [err, verified_domains] = await to (Domain.findOne({name: domain, userid: session.user._id}));
        if (err)
            return callback(new Error('Not accepted because failed to getting domain'));
        if (!verified_domains){
            let email_domain;
            [err, email_domain] = await to (Domain.findOne({name: address.address, userid: session.user._id}));
            console.log('Email domain = ' + email_domain);
            if (email_domain != null && email_domain.email_verified != null && email_domain.email_verified == true){
                return callback();
            }
            else
            {
                return callback(new Error('Email is not verified.'))
            }
            return callback(new Error('Domain not exist.'));
        } else {
            if (verified_domains.spf_verified == true && verified_domains.dkim_verified == true)
                return callback();
            else
            {
                let email_domain;
                [err, email_domain] = await to (Domain.findOne({name: address.address, userid: session.user._id}));
                console.log('Email domain = ' + email_domain);

                if (email_domain != null && email_domain.email_verified != null && email_domain.email_verified == true){
                    return callback();
                }
                else
                {
                    return callback(new Error('Email is not verified.'))
                }

                return callback(new Error('Domain is not verified all.'));
            }
        }
        callback();
    },

    // Validate RCPT TO envelope address. Example allows all addresses that do not start with 'deny'
    // If this method is not set, all addresses are allowed
    onRcptTo(address, session, callback) {
        let err;
        if (/^deny/i.test(address.address)) {
            return callback(new Error('Not accepted'));
        }

        // Reject messages larger than 100 bytes to an over-quota user
        if (address.address.toLowerCase() === 'almost-full@example.com' && Number(session.envelope.mailFrom.args.SIZE) > 100) {
            err = new Error('Insufficient channel storage: ' + address.address);
            err.responseCode = 452;
            return callback(err);
        }

        callback();
    },
    async onData(stream, session, callback) {
        let user = session.user;
        let buffer = '';
        let err;
        if (stream.sizeExceeded) {
            err = new Error('Error: message exceeds fixed maximum message size 10 MB');
            err.responseCode = 552;
            return callback(err);
        }
        for await (const chunk of stream){
            buffer += chunk;
        }
        let mail_object;
        [err, mail_object] = await to (simpleParser(buffer));
        if (err || !mail_object){
            err = new Error('Error: Failed to parse email.');
            err.responseCode = 553;
            return callback(err);
        }
        if (mail_object.to.value.length > 1){
            err = new Error('Does not support multiple receiver address.');
            err.responseCode = 560;
            return callback(err);
        }
        let un_error, unsubscribed;
        [un_error, unsubscribed] = await to (Unsubscribe.findOne({userid: user._id.toString(), email: mail_object.to.value[0].address}));

        if (unsubscribed){
            return callback(null, 'Saved email info to database without sending.'); // accept the message once the stream is ended
        }

        let email_record = new Email();
        email_record.userid = user._id;
        let from = mail_object.from.value;
        email_record.from = from[0]; //TODO how to do several
        email_record.date = mail_object.date;
        email_record.rcv_message_id = mail_object.messageId;
        email_record.subject = mail_object.subject;
        email_record.body = mail_object.text;
        email_record.body_html = mail_object.textAsHtml;
        if (mail_object.html == false){
            email_record.html = false;
        }
        else {
            email_record.html = true;
            email_record.html_content = mail_object.html
        }

        email_record.userid = session.user._id.toString();
        email_record.auth_method = ""; //TODO
        email_record.my_sent_date = new Date();
        email_record.receive_date = mail_object.date;
        email_record.sending_flag = 2;
        let mail = {};
        let to_addr = [];
        let attachments = [];
        if (mail_object.attachments.length > 0)
        {
            for (let i = 0 ; i < mail_object.attachments.length; i++){
                let at = mail_object.attachments[i];
                // attachment.emailid = saved._id;
                let attachment ={
                    content_type : at.contentType,
                    partid: at.partId,
                    content : at.content,
                    filename : at.filename,
                    contentDisposition : at.contentDisposition
                };
                email_record.attachments.push(attachment);
                attachments.push({
                    filename : at.filename,
                    content : at.content,
                    contentType : at.content_type,
                });
            }
        }
        let saved_email_record;
        [err, saved_email_record] = await to (email_record.save());
        if (err || !saved_email_record){
            err = new Error('Error occurred while saving email to our server.');
            err.responseCode = 554;
            return callback(err);
        }
        for (let i = 0; i < mail_object.to.value.length; i++){
            let to_a = mail_object.to.value[i];
            let emailto = new Emailto();
            emailto.emailid = saved_email_record._id;
            emailto.userid = user._id;
            emailto.to = to_a;
            let saved_emailto;
            [err, saved_emailto] = await to (emailto.save());
        }
        return callback(null, 'Saved email info to database without sending.'); // accept the message once the stream is ended
    },
});

async function urlify(text, email_id) {
    let $ = cheerio.load(text);
    let a_list = $("a");
    for (let i = 0 ; i < a_list.length; i++){
        let link = $(a_list[i]);
        let text = link.text();
        let href = link.attr("href");

        if ( href.indexOf('http') !== -1){
            let redirect = new Redirect({emailid: email_id, url : href, text : text});
            let err, email_redirect;
            [err, email_redirect] = await to (redirect.save());
            if (email_redirect){
                $(link).attr("href", Secrets.server_host_address + "/emails/redirect/"+ email_redirect._id.toString());
            }
            console.log(text + '=>' + href);
        }
    }
    return $.html();
}
async function check_smtp_daily_monthly(user){ //TODO
    let error, smtpservers = [], logSmtps, logmonthlySmtps;
    let usersmtps;
    [error, usersmtps] = await to (Usersmtp.find({userid: user._id.toString()}).populate('smtpserver_id'));
    for (let i = 0 ;i < usersmtps.length; i++){
        smtpservers.push(usersmtps[i].smtpserver_id);
    }
    if (smtpservers.length == 0){
        let trial = user.stripe.plan == "free" ? true : false;
        [error, smtpservers] = await to (SmtpServer.find({is_trial: trial}).sort({sent_count: 1}).limit(1));
        if (error){
            console.log(error);
        }
    }

    let nowDate = new Date();
    let beforeDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    let afterDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1);
    let lowest_id = -1;
    let lowest_count = 0;
    let totalCount;
    for (let i = 0; i < smtpservers.length; i++){
        let smtpserver = smtpservers[i];
        [error, totalCount] = await to (LogSmtp.countDocuments({sent_date : { $gte : beforeDate, $lte: afterDate}}));
        if (lowest_count == 0 && totalCount < smtpserver.daily_count){
            lowest_id = i;
            lowest_count = totalCount;
        }
        if (lowest_count > totalCount && totalCount < smtpserver.daily_count){
            lowest_count = totalCount;
            lowest_id = i;
        }
    }
    if (lowest_count != -1)
        return smtpservers[lowest_id];

    beforeDate = new Date(nowDate.getFullYear(), nowDate.getMonth());
    afterDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1);
    lowest_id = -1;
    lowest_count = 0;
    for (let i = 0; i < smtpservers.length; i++){
        let smtpserver = smtpservers[i];
        [error, totalCount] = await to (LogSmtp.countDocuments({sent_date : { $gte : beforeDate, $lte: afterDate}}));
        if (lowest_count == 0 && totalCount < smtpserver.monthly_count){
            lowest_id = i;
            lowest_count = totalCount;
        }
        if (lowest_count > totalCount && totalCount < smtpserver.monthly_count){
            lowest_count = totalCount;
            lowest_id = i;
        }
    }
    if (lowest_count != -1)
        return smtpservers[lowest_id];
    return null;
}
async function checkdaily(user){
    let error, emails;
    let sent_date_criteria = { my_sent_success_date: 1 };
    [error, emails] = await to (Email.find({ sent: 1, sending_flag: 2}).limit(user.daily_count).sort(sent_date_criteria));
    if (emails.length < user.hourly_count){
        return true;
    } else {
        let first_email = emails[0];
        let sent_date = first_email.my_sent_success_date;
        let now_date = new Date();
        let before_one_hour = new Date(now_date.getTime() - 24 * 60 * 60000);
        if (before_one_hour < sent_date){
            return true;
        } else {
            return false;
        }
    }
}

async function checkhourly(user) {
    let error, emails;
    let sent_date_criteria = { my_sent_success_date: 1 };
    [error, emails] = await to (Email.find({ sent: 1, sending_flag: 2}).limit(user.hourly_count).sort(sent_date_criteria));
    if (emails.length < user.hourly_count){
        return true;
    } else {
        let first_email = emails[0];
        let sent_date = first_email.my_sent_success_date;
        let now_date = new Date();
        let before_one_hour = new Date(now_date.getTime() - 60 * 60000);
        if (before_one_hour < sent_date){
            return true;
        } else {
            return false;
        }
    }
}
function getDomainFromEmail(email){
    let pos = email.indexOf('@');
    if (pos != -1){
        let substr = email.substring(pos + 1);
        return substr.replace('>', '').replace('<', '');
    }
    return '';
}

server.on('error', err => {
    console.log('Error occurred');
    console.log(err);
});

// start listening
server.listen(Secrets.my_smtp_options.port, SERVER_HOST);
