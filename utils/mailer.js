var secrets = require('../config/secrets');
var nodemailer = require('nodemailer');
var email_option = secrets.global_smtp_options;
const { to , ReE , ReS} = require('./../utils/util');
let smtpTransport = nodemailer.createTransport({
    host : email_option.host,
    port: email_option.port,
    secure: true,
    auth : {
        user : email_option.auth_user,
        pass : email_option.auth_pass
    },
    tls:{
        rejectUnauthorized: false
    }

});
exports.sendEmail = async function(mail , cb){
    let smtpError, smtpInfo;
    [smtpError, smtpInfo] = await to (smtpTransport.sendMail(mail));
    if (cb != undefined)
    {
        cb(smtpError, smtpInfo);
    }
    return [smtpError, smtpInfo];
    // smtpTransport.sendMail(mail, function(error, info){
    //     if (error)
    //     {
    //         console.log(error);
    //     } else {
    //         console.log('mail sent:', info.response);
    //     }
    //
    //     if (cb != undefined)
    //         cb(error, info);
    //
    // });
};
