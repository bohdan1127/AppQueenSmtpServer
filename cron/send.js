let User = require('../models/user');
let Email = require('./../models/email');
let Domain = require('./../models/domain');
let Count = require('./../models/count');
let Emailto = require('./../models/emailto');
let LogSmtp = require('../models/log_smtp');
let Secrets = require('../config/secrets');
let Redirect = require('../models/redirect');
let SendDomain = require('../models/senddomain');
let SmtpServer = require('../models/smtp_server');
let Usersmtp = require('../models/usersmtp');
let LogEmail = require('../models/log_email');
let Setting = require('../models/setting');
let BounceEmail =  require('../models/bounce_email');
let Bounces = require('../controllers/bounce-controller');
let iMapBounce = require('../smtp/imap');
var verifier = require('email-verify');
var infoCodes = verifier.infoCodes;
let Generator = require('generate-password');

let emailCheck = require('email-check');
const nodemailer = require('nodemailer');

const EmailValidator = require('email-deep-validator');
const emailValidator = new EmailValidator();
let cheerio = require("cheerio");
let send_first_time = 0;
const { to , ReE , ReS} = require('./../utils/util');

let cron =  require('cron');

let sent_count = 0;

let is_running = false;
const send_email = async () => {
    if (is_running == true)
    {
        return;
    }
    is_running = true;
    // console.log(new Date());
    // console.log('Send Cron log');
    let error, emails, err, total_count;
    let setting; let email_count = Secrets.count_sendemail_per_second;
    [error, setting] = await to (Setting.findOne({}));
    if (setting && setting.emails_per_second != undefined)
    {
        email_count = setting.emails_per_second;
    }
    [err, total_count] = await to (Email.countDocuments({$or: [{sent: 0}, {sent: 3}, {sent: 4}, {sent: 5}, {sent: 6}, {sent: 7}, {sent: 8}, {sent: 9}, {sent: 10}], unsubscribe_status: 0, sending_flag: 2, review_status: 0}));
    if (sent_count >= total_count){
        sent_count = 0;
    }
    let received_date_sort = { receive_date: 1 };
    [error, emails] = await to (Email.find({ $or: [{sent: 0}, {sent: 3}, {sent: 4}, {sent: 5}, {sent: 6}, {sent: 7}, {sent: 8}, {sent: 9}, {sent: 10}], unsubscribe_status: 0, sending_flag: 2, review_status: 0}).
    skip(sent_count).limit(email_count).
    sort(received_date_sort).populate('destaddr').populate('userid'));
    // [error, emails] = await to (Email.find({}).limit(1).sort(received_date_sort).populate('destaddr').populate('userid'));

    if (error){
        is_running = false;
        return 'error';
    }

    let ids = [];
    for (let i = 0; i < emails.length; i++){
        ids.push(emails[i]._id.toString());
    }
    let result;
    if (emails.length < 1){
        [err, result] = await to (Email.updateMany({sending_flag: 1} , {$set: { sending_flag:2}},{multi: true}));
        if (err || result.ok != 1){
            is_running = false;
            return;
        }
        is_running = false;
        return;
    }

    [err, result] = await to (Email.updateMany({_id: ids}, {$set: { sending_flag: 1}},{multi: true}));
    if (err || result.ok != 1){
        is_running = false;
        return;
    }
    // for (let i = 0 ; i < emails.length; i++){
    //     let m_email = emails[i];
    //     m_email.sending_flag = 1;
    //     let saved_email;
    //     [err, saved_email] = await to (m_email.save());
    // }

    for (let i = 0; i < emails.length; i++){
        sent_count++;
        let email = emails[i];
        // let html_content = email.html_content;
        let html_content = '';
        if (email.html){
            for await (const chunk of email.html_content){
                html_content += chunk;
            }
        }


        let user = email.userid;
        let email_user = emails[i].userid;
        let email_tos_ = emails[i].destaddr;
        let count;
        [err, count] = await to (Count.findOne({userid: email_user._id.toString()}));
        if (error || !count){
            email.log = 'Failed to get count of your user.';
            let saved_count;
            [err, saved_count] = await to (email.save());
            continue;
        }
        let remain_count = count.total_count - count.sent_count;
        let payment_status = false;
        if (user.payment_status == 1){
            payment_status = true;
        } else if (user.payment_status == 0){
            if (user.stripe.plan == "free"){
                payment_status = true;
            }
        }
        if (user.status == 0){
            if (payment_status == true){
                if (remain_count > 0){
                    let domain = getDomainFromEmail(email.from.address);
                    if (email.checked_review_status == undefined || email.checked_review_status == 0){
                        let logemail, logemail_error;

                        [logemail_error, logemail] = await to (LogEmail.findOne({userid: user._id.toString(), email_body: email.html ? email.html_content : email.body_html, email_subject: email.subject}));
                        if (logemail_error == null){
                            if (logemail){

                                let count = 50;
                                if (setting){
                                    count = setting.new_send_count;
                                }
                                if (logemail.email_same_count < count && logemail.status == 0){
                                    //to send
                                    logemail.email_same_count += 1;
                                    let updated;
                                    [error, updated] = await to (logemail.save());
                                    email.checked_review_status = 1;
                                    [error, updated] = await to (email.save());
                                } else if (logemail.email_same_count == count && logemail.status == 0){
                                    let updated;
                                    if (logemail.emailid == undefined){
                                        logemail.emailid = email._id.toString();
                                        logemail.userid = user._id.toString();
                                        [error, updated] = await to (logemail.save());
                                        email.log_email_id = logemail._id.toString();
                                        email.review_status = 1;
                                    }
                                    email.sending_flag = 2;
                                    email.log = "This email is reviewed.";
                                    [error, updated] = await to (email.save());
                                    continue;
                                } else if (logemail.email_same_count == count && logemail.status == 1){
                                    //to send
                                }
                            }
                            else
                            {
                                let newlogemail = new LogEmail({userid: user._id.toString(), email_body: email.html ? email.html_content : email.body_html, email_subject: email.subject});
                                newlogemail.email_same_count = 1;
                                let m_error, updated;
                                [m_error, updated] = await to (newlogemail.save());

                            }
                        } else {
                            continue;
                        }
                    }


                    let smtpTransport;
                    let smtpserver = await check_smtp_daily_monthly(email.userid);

                    if (smtpserver != false && smtpserver != null){
                        smtpTransport = nodemailer.createTransport({
                            host : smtpserver.host,
                            port: smtpserver.port,
                            secure: smtpserver.encryption == 0 ? false : true,
                            auth : {
                                user : smtpserver.username,
                                pass : smtpserver.userpass
                            },
                            tls:{
                                rejectUnauthorized: false
                            }
                        });
                        //
                        let b_error, b_bounce;
                        // let bounce_username = "bounce-" + user._id.toString() + "@" + smtpserver.domain;
                        let bounce_username = "bounce-" + user._id.toString() ;
                        let bounce_pwd = Generator.generate({
                            length: 10, numbers: true
                        });

                        [b_error, b_bounce] = await to (BounceEmail.findOne({smtpserver_id: smtpserver._id, userid: email.userid, email_id: bounce_username}));
                        if (b_bounce)
                        {
                            let error, ret;
                            [error, ret] = await to (Bounces.existUserDomain(bounce_username, smtpserver.domain));
                            if (ret == true)
                            {
                                let map_bounce = iMapBounce.isExist(b_bounce._id.toString());
                                if (map_bounce == null)
                                {
                                    let map_bounce = new iMapBounce.BounceEmailListener(b_bounce._id.toString());
                                    await (map_bounce.init());
                                    iMapBounce.BounceEmailArray.push(map_bounce);
                                    map_bounce.startImap();
                                }
                                else if (map_bounce != null && !map_bounce.getRunningState())
                                {
                                    map_bounce.startImap();
                                }
                            }
                            else
                            {
                                let bounce_create_ret;
                                [error, bounce_create_ret] = await to (Bounces.createUserDomain(bounce_username, b_bounce.email_pwd, smtpserver.domain));
                                if (bounce_create_ret == true)
                                {
                                    let map_bounce = new iMapBounce.BounceEmailListener(b_bounce._id.toString());
                                    await (map_bounce.init());
                                    iMapBounce.BounceEmailArray.push(map_bounce);
                                    map_bounce.startImap();
                                }
                                else
                                {
                                    continue;
                                }
                            }

                        }
                        else
                        {
                            let error, ret;

                            [error, ret] = await to (Bounces.existUserDomain(bounce_username, smtpserver.domain));

                            if (ret == false){
                                let bounce_create_ret;
                                [error, bounce_create_ret] = await to (Bounces.createUserDomain(bounce_username, bounce_pwd, smtpserver.domain));
                                if (bounce_create_ret == true){
                                    let bounce = new BounceEmail({userid: user._id, smtpserver_id: smtpserver._id, email_id: bounce_username, email_pwd: bounce_pwd, domain: smtpserver.domain});
                                    let saved;
                                    [error, saved] = await to (bounce.save());

                                    if (saved){
                                        let bounce = new iMapBounce.BounceEmailListener(saved._id.toString());
                                        await (bounce.init());
                                        iMapBounce.BounceEmailArray.push(bounce);
                                        bounce.startImap();
                                    }
                                }
                            } else {
                                let bounce = new BounceEmail({userid: user._id, smtpserver_id: smtpserver._id, email_id: bounce_username, email_pwd: bounce_pwd, domain: smtpserver.domain});
                                let saved;
                                [error, saved] = await to (bounce.save());
                                if (saved){
                                    let bounce = new iMapBounce.BounceEmailListener(saved._id.toString());
                                    await (bounce.init());
                                    iMapBounce.BounceEmailArray.push(bounce);
                                    bounce.startImap();
                                }
                            }
                        }
                        //


                        let daily_ = await checkdaily(user);
                        let hourly_ = await checkhourly(user);

                        if (daily_ == true) {
                            if (hourly_ == true) {
                                let to_addr = [];
                                let mail = {};
                                for (let i = 0 ; i < email_tos_.length; i++){
                                    let m_email_to = email_tos_[i];
                                    // let result = false;
                                    // const { wellFormed, validDomain, validMailbox } = await emailValidator.verify(m_email_to.to.address);
                                    // if (wellFormed == true && validDomain == true && validMailbox == null){
                                    //     result = true;
                                    // }
                                    // if (result == true){ //For test
                                    //     to_addr.push(m_email_to.to);
                                    // }
                                    // else {
                                    //     email.bounce_status = 1;
                                    //     let updated;
                                    //     [err , updated] = await to (email.save());
                                    //     break;
                                    // }
                                    let domain = getDomainFromEmail(m_email_to.to.address);
                                    let d_error, send_domain;
                                    [d_error, send_domain] = await to (SendDomain.findOne({name : domain}));
                                    if (send_domain){
                                        let check_error, res;
                                        //[check_error, res] = await to (emailCheck(m_email_to.to.address));
                                        [check_error, res] = await to (email_verify(m_email_to.to.address));
                                        if (check_error || res.error){
                                            email.bounce_status = 1;
                                            email.my_sent_success_date = new Date();
                                            let updated;
                                            [err , updated] = await to (email.save());
                                            break;
                                        }
                                        if (res.info.success == true){
                                            to_addr.push(m_email_to.to);
                                        }
                                    }
                                    else {
                                        to_addr.push(m_email_to.to);
                                    }

                                    // to_addr.push(m_email_to.to);

                                }
                                if (to_addr.length > 0){

                                    let sender_domain = getDomainFromEmail(email.from.address);
                                    let verified_email;
                                    [err, verified_domains] = await to (Domain.findOne({name: sender_domain, userid: user._id, spf_verified: true, dkim_verified: true }));
                                    let verified_domain_flag = false;
                                    if (verified_domains){
                                        verified_domain_flag = true;
                                    } else {
                                        [err, verified_email] = await to (Domain.findOne({name: email.from.address, userid: user._id, email_verified: true}));
                                        if (verified_email){
                                            verified_domain_flag = true
                                        }
                                    }
                                    if (verified_domain_flag){
                                        let randomIV = email._id.toString();
                                        let link = '';
                                        let track_msg = '';
                                        let unsubscribe_link = '';
                                        if (setting && setting.send_open_link != undefined && setting.send_open_link == true)
                                        {
                                            link=Secrets.server_host_address + "/email_track/" + randomIV;
                                            track_msg = '<img src="'+ link + '" width="1" height="1" />';

                                            console.log('Track msg = ' + track_msg)
                                        }
                                        if (setting && setting.send_unsubscribe_link != undefined && setting.send_unsubscribe_link == true && user.unsubscribe_link == true){
                                            unsubscribe_link = Secrets.server_host_address + "/emails/unsubscribe/" + randomIV;
                                            //let footer = '<br><a href="'+ link1 + '" width="1" height="1"> Email send using QueenSMTP </a>';
                                            let footer = '<br>If you\'d like to unsubscribe and stop receiving these emails <a href="'+ unsubscribe_link + '" width="1" height="1"> click here</a>';
                                            track_msg += footer;

                                            console.log('Unsubscribe msg = ' + footer)
                                        }
                                        let privateKey = "";
                                        let selector = "";
                                        let domain = "";
                                        if (verified_domains){
                                            privateKey = verified_domains.private_key;
                                            selector = verified_domains.dkim_host_name;
                                            domain = verified_domains.name;
                                        } else if (verified_email){
                                            privateKey = smtpserver.dkim_private_key;
                                            selector = smtpserver.dkim_host_name;
                                            domain = smtpserver.domain;
                                        }

                                        console.log("Sending from = " + bounce_username + "@" + smtpserver.domain);

                                        // console.log('SMTPSERver = ' + smtpserver);
                                        // console.log('Privaate KEy = ' + smtpserver.dkim_private_key);
                                        // console.log('Privaate KEy = ' + privateKey);
                                        if (email.html == true)
                                        {
                                            // let html = email.html_content;
                                            let html = html_content;
                                            if (setting && setting.send_click_link != undefined && setting.send_click_link == true){
                                                html = await (urlify(html_content, email._id));
                                            }
                                            let messageId = email._id.toString() + "@" + smtpserver.domain;
                                            mail = {
                                                messageId: messageId,
                                                // messageId:'tawyresutiyoupi7pr968oe57irth@kilagbe.com',
                                                headers: {
                                                    'Feedback-ID': user.email + ":" + user.smtp_username + ":"  + messageId,
                                                    'X-Report-Abuse': 'You can also report abuse here: http://queensmtp.com/contact',
                                                    'Precedence': 'bulk'
                                                },
                                                list: {
                                                    help: 'help@queensmtp.com?subject=Help Needed',
                                                    unsubscribe: {
                                                        url: unsubscribe_link,
                                                        comment: 'Unsubscribe Me'
                                                    },
                                                },
                                                from : {name: email.from.name, address: email.from.address},
                                                subject: email.subject,
                                                to: to_addr,
                                                html : html + track_msg,
                                                attachments: email.attachments,
                                                envelope:{
                                                    //from: Secrets.bounce_email,
                                                    from: bounce_username + "@" + smtpserver.domain,
                                                    to: to_addr,
                                                },
                                                // dkim: {
                                                //     messageId: email._id.toString() + "@" + smtpserver.domain,
                                                //     domainName: sender_domain,
                                                //     keySelector: "queensmtp",
                                                //     privateKey: verified_domains.private_key
                                                // }
                                                dkim: {
                                                    messageId: email._id.toString() + "@" + smtpserver.domain,
                                                    //domainName: "ms3.rnsm.net",
                                                    // keySelector: "1580535334.rnsm",
                                                    domainName: domain,
                                                    keySelector: "queensmtp",
                                                    privateKey: privateKey
                                                }
                                            };
                                        } else {
                                            let html = email.body;
                                            if (setting && setting.send_click_link != undefined && setting.send_click_link == true){
                                                html = await (urlify(email.body, email._id));
                                            }
                                            let messageId = email._id.toString() + "@" + smtpserver.domain;


                                            mail = {
                                                messageId: messageId,
                                                // messageId:'tawyresutiyoupi7pr968oe57irth@kilagbe.com',
                                                headers: {
                                                    'Feedback-ID': user.email + ":" + user.smtp_username + ":"  + messageId,
                                                    'X-Report-Abuse': 'You can also report abuse here: http://queensmtp.com/contact',
                                                    'Precedence': 'bulk'
                                                },
                                                list: {
                                                    help: 'help@queensmtp.com?subject=Help Needed',
                                                    unsubscribe: {
                                                        url: unsubscribe_link,
                                                        comment: 'Unsubscribe Me'
                                                    },
                                                },
                                                from : {name: email.from.name, address: email.from.address},
                                                to: to_addr,
                                                subject: email.subject,
                                                html : html + track_msg,
                                                attachments: email.attachments,
                                                envelope:{
                                                    //from: Secrets.bounce_email,
                                                    from: bounce_username + "@" + smtpserver.domain,
                                                    to: to_addr,
                                                },
                                                // dkim: {
                                                // messageId: email._id.toString() + "@" + smtpserver.domain,
                                                //     domainName: sender_domain,
                                                //     keySelector: "queensmtp",
                                                //     privateKey: verified_domains.private_key
                                                // }
                                                dkim: {
                                                    messageId: email._id.toString() + "@" + smtpserver.domain,
                                                    // domainName: "ms3.rnsm.net",
                                                    // keySelector: "1580535334.rnsm",
                                                    domainName: domain,
                                                    keySelector: "queensmtp",
                                                    privateKey: privateKey
                                                }
                                            };
                                        }
                                        let smtpError, info;
                                        [smtpError, info] = await to (smtpTransport.sendMail(mail));
                                        email.sending_flag = 2;
                                        if (smtpError || !info){
                                            email.sending_flag = 2;
                                            email.sent = 3;
                                            email.log = JSON.stringify(smtpError.stack);
                                            let updatedSavedEmailrecord;
                                            let m_eeerrro;
                                            [m_eeerrro, updatedSavedEmailrecord] = await to (email.save());
                                        } else {
                                            count.sent_count = count.sent_count + 1;
                                            let saved_count;
                                            [err, saved_count] = await to (count.save());

                                            email_user.total_sent_count += 1;
                                            let saved_user;
                                            [err, saved_user] = await to (email_user.save());
                                            if (err && !saved_user){
                                                //error
                                            }

                                            smtpserver.sent_count += 1;
                                            let error1, saved;
                                            [error1, saved] = await to (smtpserver.save());

                                            let logSmtp = new LogSmtp({userid: user._id, emailid: email._id, smtpid: smtpserver._id, sent_date: new Date()});
                                            let error2, savedlog;
                                            [error2, savedlog] = await to (logSmtp.save());


                                            email.sent = 1;
                                            email.sending_flag = 2;
                                            email.my_sent_success_date = new Date();
                                            email.log = info.response.toString();
                                            let updatedSavedEmailrecord;
                                            [error, updatedSavedEmailrecord] = await to (email.save());
                                            console.log('mail sent:', info.response);
                                        }
                                    }
                                    else {
                                        email.log = 'The sender email is not verified.';
                                        email.sent = 10;
                                        email.sending_flag = 2;
                                        let updateRecord;
                                        [err, updateRecord] = await to (email.save());
                                    }

                                } else {
                                    email.log = 'This is bounce email.';
                                    email.bounce_status = 1;
                                    email.sent = 2;
                                    email.sending_flag = 2;
                                    email.my_sent_success_date = new Date();
                                    let updateRecord;
                                    [err, updateRecord] = await to (email.save());
                                }
                            } else {
                                email.log = 'Did not send because hourly limited.';
                                email.sent = 5;
                                email.sending_flag = 2;
                                let updateRecord;
                                [err, updateRecord] = await to (email.save());
                            }
                        } else {
                            email.log = 'Did not send because daily limited.';
                            email.sent = 6;
                            email.sending_flag = 2;
                            let updateRecord;
                            [err, updateRecord] = await to (email.save());
                        }

                    } else if (smtpserver == null) {
                        email.sent = 4;
                        email.sending_flag = 2;
                        email.log = 'There is no external server for this user.';
                        let updateRecord;
                        [err, updateRecord] = await to (email.save());
                    }

                } else {
                    email.log = 'Limited Count';
                    email.sent = 9;
                    let updateRecord;
                    [err, updateRecord] = await to (email.save());
                }
            } else {
                email.log = 'Payment did not success.';
                email.sent = 7;
                let updateRecord;
                [err, updateRecord] = await to (email.save());
            }
        } else {
            email.log = 'User status is not active';
            email.sent = 8;
            let updateRecord;
            [err, updateRecord] = await to (email.save());
        }


    }

    if (send_first_time == 0){
        [err, result] = await to (Email.updateMany({sending_flag: 1} , {$set: { sending_flag:2}},{multi: true}));
        if (err || result.ok != 1){
            is_running = false;
            return ;
        }
        send_first_time = 1;
    } else {
        [err, result] = await to (Email.updateMany({_id: ids}, {$set: { sending_flag: 2}},{multi: true}));
        if (err || result.ok != 1){
            is_running = false;
            return;
        }
    }
    is_running = false;

};
let cron_job = cron.job("* * * * * *", () => {
    send_email();
});
cron_job.start();

async function email_verify(email) {
    return new Promise((resolve, reject) => {
        verifier.verify(email, function(error, info){
            return resolve({ error, info });
        });
    });
}

async function urlify(text, email_id, userid) { //TODO EDIT
    let $ = cheerio.load(text);
    let a_list = $("a");
    for (let i = 0 ; i < a_list.length; i++){
        let link = $(a_list[i]);
        let text = link.text();
        let href = link.attr("href");
        console.log(href);
        if (href != undefined && (href.indexOf('http://') !== -1 || href.indexOf('https://') !== -1)){
            let redirect = new Redirect({userid: userid,emailid: email_id, url : href, text : text});
            let err, email_redirect;
            [err, email_redirect] = await to (redirect.save());
            if (email_redirect){
                $(link).attr("href", Secrets.server_host_address + "/emails/redirect/"+ email_redirect._id.toString());
            }
        }

    }

    return $.html();
}
async function checkdaily(user){
    let error, emails;
    let sent_date_criteria = { my_sent_success_date: 1 };
    [error, emails] = await to (Email.find( {userid: user._id.toString(), sent: 1, sending_flag: 2}).limit(user.daily_count).sort(sent_date_criteria));
    if (emails.length < user.daily_count){
        return true;
    } else {
        let first_email = emails[0];
        let sent_date = first_email.my_sent_success_date;
        if (sent_date == undefined){
            sent_date = first_email.my_sent_date
        }
        let now_date = new Date();
        let before_one_hour = new Date(now_date.getTime() - 24 * 60 * 60000);
        if (before_one_hour > sent_date){
            return true;
        } else {
            return false;
        }
    }
}
async function checkhourly(user) {
    let error, emails;
    let sent_date_criteria = { my_sent_success_date: 1 };
    [error, emails] = await to (Email.find({userid: user._id.toString(), sent: 1, sending_flag: 2}).limit(user.hourly_count).sort(sent_date_criteria));


    if (emails.length < user.hourly_count){
        return true;
    } else {
        let first_email = emails[0];
        let sent_date = first_email.my_sent_success_date;
        if (sent_date == undefined){

            sent_date = first_email.my_sent_date
        }

        let now_date = new Date();
        let before_one_hour = new Date(now_date.getTime() - 60 * 60000);

        if (before_one_hour > sent_date){

            return true;
        } else {

            return false;
        }
    }

}

async function check_smtp_daily_monthly(user){ //TODO
    let error, smtpservers = [], logSmtps, logmonthlySmtps;
    let usersmtps;
    [error, usersmtps] = await to (Usersmtp.find({userid: user._id.toString()}).populate('smtpserver_id'));
    for (let i = 0 ;i < usersmtps.length; i++){
        if (usersmtps[i].smtpserver_id != undefined)
            smtpservers.push(usersmtps[i].smtpserver_id);
    }
    if (smtpservers.length == 0){
        let trial = user.stripe.plan == "free" ? true : false;
        if (trial == true)
        {
            [error, smtpservers] = await to (SmtpServer.find({is_trial: trial}).sort({sent_count: 1}).limit(1));
        }
        else
        {
            [error, smtpservers] = await to (SmtpServer.find({}).sort({sent_count: 1}).limit(1));
        }


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

function getDomainFromEmail(email){
    let pos = email.indexOf('@');
    if (pos != -1){
        let substr = email.substring(pos + 1);
        return substr.replace('>', '').replace('<', '');
    }
    return '';
}