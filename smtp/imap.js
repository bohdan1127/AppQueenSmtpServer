let MailListener = require("mail-listener5").MailListener;
let BounceEmail =  require('../models/bounce_email');
let BounceEmailCount = require('../models/bounce_email_count');
const { to , ReE , ReS} = require('./../utils/util');
BounceEmailArray = [];
module.exports.BounceEmailArray = BounceEmailArray;
let simpleParser = require('mailparser').simpleParser;
var MailParser = require("mailparser").MailParser;


var Imap = require('imap'),
    inspect = require('util').inspect;


module.exports.BounceEmailListener = class BounceEmailListener
{
    constructor(bounceid) {
        this.bounceid = bounceid;
    }
    async init()
    {
        let parent = this;
        let ret, error;
        [error, ret] = await to (BounceEmail.findById(this.bounceid).populate("smtpserver_id"));
        let smtp_server = ret.smtpserver_id;
        this.user = ret.email_id;
        this.domain = smtp_server.domain;
        this.imap = new Imap({
            user: ret.email_id + "@" + smtp_server.domain,
            // user:"bounce-5e2fcf85f7a4e7644c959ab6@rnsm.net",
            // password: 'password',
            password: ret.password,
            host: smtp_server.domain,
            port: 143,
            tls: false
        });

        this.mailListener = new MailListener({
            username: ret.email_id + "@" + smtp_server.domain,
            // username: "bounce-5e2fcf85f7a4e7644c959ab6@rnsm.net",
            password: ret.email_pwd,
            // password: "password",
            host: smtp_server.domain,
            port: 143, // imap port
            tls: false,
            connTimeout: 10000, // Default by node-imap
            authTimeout: 10000, // Default by node-imap,
            debug: console.log, // Or your custom function with only one incoming argument. Default: null
            tlsOptions: { rejectUnauthorized: false },
            mailbox: "INBOX", // mailbox to monitor
            searchFilter: ["UNSEEN", "RECENT"], // the search filter being used after an IDLE notification has been retrieved
            markSeen: true, // all fetched email willbe marked as seen and not fetched next time
            fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
            // fetchUnreadOnStart: false, // use it only if you want to get all unread email on lib start. Default is `false`,
            mailParserOptions: {streamAttachments: true}, // options to be passed to mailParser lib.
            attachments: false, // download attachments as they are encountered to the project directory
            attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
        });

        this.serverConnected = false;

        //this.mailListener.start();

        this.mailListener.on("server:connected", function(){
            console.log("imapConnected");
            parent.serverConnected = true;

        });

        this.mailListener.on("mailbox", function(mailbox){
            //console.log("Total number of mails: ", mailbox.messages.total); // this field in mailbox gives the total number of emails
        });

        this.mailListener.on("server:disconnected", function(){
            console.log("imapDisconnected");
            parent.serverConnected = false;
            //mailListener.start();
        });

        this.mailListener.on("error", function(err){
            console.log(err);
            this.error = err;
        });

        this.mailListener.on("mail", async function(mail, seqno, attributes){
            // do something with mail object including attachments
            let bounce_email, error;
            console.log("Bounce Email Received");
            console.log("Parent = " , parent);
            console.log("Bounce id = " + parent.bounceid);
            console.log("Bounce email = " + parent.user);
            console.log("Bounce domain = " + parent.domain);
            console.log("Mail content = " + mail);
            console.log("Mail Seq no = " + seqno);
            console.log("Attributes = " + attributes);

            simpleParser(JSON.stringify(mail)).then(function (mail_object) {
                // console.log(mail_object);
            }).catch(function(err){
            });
            if (parent.bounceid != undefined){
                [error, bounce_email] = await to (BounceEmail.findById(parent.bounceid));
            }
            else if (parent.user != undefined && parent.domain != undefined)
            {
                [error, bounce_email] = await to (BounceEmail.findOne({email_id: parent.user, domain: parent.domain}));
            }
            else
            {
                console.log('BounceId is undefined');
                return;
            }
            if (bounce_email != null){
                let date = bounce_email.updatedDate;
                let nowDate = new Date();
                if (date != null)
                {
                    let beforeDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
                    if (beforeDate > date)
                    {
                        bounce_email.daily_count = 0;
                    }
                }
                bounce_email.updatedDate = nowDate;
                bounce_email.daily_count += 1;
                bounce_email.total_count += 1;
                let updated;
                [error, updated] = await to (bounce_email.save());

                let newBounce = new BounceEmailCount({userid: bounce_email.userid});
                newBounce.updatedDate = nowDate;
                let saved;
                [error, saved] = await to (newBounce.save());

            }
            // mail processing code goes here
        });
    }
    getRunningState()
    {
        return this.serverConnected;
    }

    startImap()
    {
        if (!this.serverConnected)
        {
            this.mailListener.start();
        }

    }

    getBounceId(){
        return this.bounceid;
    }
};

exports.isExist = function(bounceid) {
    for (let i = 0 ;i < BounceEmailArray.length; i++)
    {
        let bounce = BounceEmailArray[i];
        if (bounce.bounceid == bounceid)
        {
            return bounce
        }
    }
    return null;
};
exports.isRunning = function(bounceid) {
    for (let i = 0 ;i < BounceEmailArray.length; i++)
    {
        let bounce = BounceEmailArray[i];
        if (bounce.bounceid == bounceid)
        {
            return bounce.getRunningState();
        }
    }
    return false;
};


