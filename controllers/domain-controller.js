var User = require('../models/user');
var Domain = require('../models/domain');
var Record = require('../models/record');
var path = require('path');
const dns = require('dns');
var cp = require('child_process'), assert = require('assert');
const { to , ReE , ReS, removeSpace} = require('./../utils/util');
const {check, oneOf, validationResult}= require('express-validator');
let fs = require('fs');
let mailer = require('./../utils/mailer');
let Secrets = require('../config/secrets');

exports.getDomains = async function(req, res, next){
    var form = {},
        error = null,
        formFlash = req.flash('form'),
        errorFlash = req.flash('error');

    if (formFlash.length > 0) {
        form.email = formFlash[0].email;
    }
    if (errorFlash.length > 0) {
        error = errorFlash[0];
    }
    return res.render(req.render, { user:req.user ,form: form, error : error});


};
exports.deleteDomain = async function(req, res, next){
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('errors', errors.array());
        return res.redirect(req.redirect.failure);
    }
    let user_id = req.body.domain_id;

    let err, result;
    [err, result] = await to (Domain.deleteOne({_id: user_id}));

    if (result.ok == 1){
        req.flash('success', 'Success to delete domain');
        return res.redirect(req.redirect.success);
    }
    req.flash('error', 'Failed to delete domain.');
    return res.redirect(req.redirect.failure);
};

exports.domainResendEmail = async function(req, res, next){
    let domain_id = req.body.domain_id;
    let domain, error;
    [error, domain] = await to (Domain.findById(domain_id));
    if (error || domain == undefined){
        req.flash('error', 'Failed to send verification email because this record is not exist on database');
        return res.redirect(req.redirect.failure)
    }
    if (domain.type == 1){
        let filePath = path.join(__dirname, '../public/html/verification.html');
        var htmldata  =  fs.readFileSync(filePath, 'utf8');
        var link= Secrets.server_host_address + "/domain/verify/email/" + domain._id.toString();
        htmldata = htmldata.replace('robertallen@company.com', domain.name);
        htmldata = htmldata.replace('https://example.com/activation', link);
        var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
        htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
        htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');
        let mailerror, mailinfo;
        [mailerror, mailinfo] = await (mailer.sendEmail({
            from : '"QUEENSMTP.COM" <info@queensmtp.com>',
            to : [{ address: domain_name, name:""}],
            subject: 'Please verify your email address',
            html : htmldata
        }, null));

        if (mailinfo){
            req.flash('success', 'Success to send verification email.');
            return res.redirect(req.redirect.failure);
        }
        else {
            req.flash('error', 'Failed to send email. Please try to send email again.');
            return res.redirect(req.redirect.failure);
        }
    }
    else {
        req.flash('error', 'This record is not email.');
        return res.redirect(req.redirect.failure)
    }
};
exports.addDomain = async function(req, res, next){
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('errors', errors.array());
        return res.redirect(req.redirect.failure);
    }
    let user, user_error;
    let user_id = req.user._id.toString();
    [user_error, user] = await to (User.findById(user_id));
    let domain_name = removeSpace(req.body.domain);
    let domain = new Domain({userid: user_id, name: domain_name});
    let err, created, m_order;

    // [err, m_order] = await to (Domain.findOne({userid: user_id, name: domain_name}));
    [err, m_order] = await to (Domain.findOne({name: domain_name}));

    if (m_order){
        if (m_order.userid.toString() == user_id){
            req.flash('error', 'Domain already exists.');
            return res.redirect(req.redirect.failure);
        } else {
            if (m_order.dkim_verified == true && m_order.spf_verified == true){
                req.flash('error', 'The domain which you added is using by other user. Contact support if you have any questions.');
                return res.redirect(req.redirect.failure);
            }

        }
    }
    let type = 0;
    if (domain_name.indexOf('@') != -1){
        type = 1
    }
    domain.type = type;
    let updated_domain;
    [err, updated_domain] = await to (domain.save());
    domain = updated_domain;

    if (type == 1){
        let filePath = path.join(__dirname, '../public/html/email_verification.html');
        var htmldata  =  fs.readFileSync(filePath, 'utf8');
        var link= Secrets.server_host_address + "/domain/verify/email/" + domain._id.toString();
        htmldata = htmldata.replace('robertallen@company.com', domain.name);
        htmldata = htmldata.replace('https://example.com/activation', link);
        var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
        htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
        htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');
        let mailerror, mailinfo;
        [mailerror, mailinfo] = await (mailer.sendEmail({
            from : '"QUEENSMTP.COM" <info@queensmtp.com>',
            to : [{ address: domain_name, name:""}],
            subject: 'Please verify your email address',
            html : htmldata
        }, null));

        if (mailinfo){
            req.flash('success', 'We have send a verification email Please check your email and click verify button.');
            return res.redirect(req.redirect.failure);
        }
        else {
            req.flash('error', 'Failed to send email. Please try to send email again.');
            return res.redirect(req.redirect.failure);
        }


    }
    let records;
    [err, records] = await to (Record.find());
    // if (records.length == 0){
    //     req.flash('errors', errors.array());
    //     return res.redirect(req.redirect.failure);
    // }
    let db_record = '';
    for (let i = 0 ; i < records.length; i++){
        db_record = records[i].name + ' ';
    }

    var privateKey, publicKey;
    publicKey = '';
    cp.exec('openssl genrsa 1024', function(err, stdout, stderr) {
        assert.ok(!err);
        privateKey = stdout;
        console.log(privateKey);
        makepub = cp.spawn('openssl', ['rsa', '-pubout']);
        makepub.on('exit', function(code) {
            assert.equal(code, 0);
        });
        makepub.stdout.on('data', function(data) {
            publicKey += data;

            // privateKey = privateKey.replace(/(?:\\[rn]|[\r\n]+)+/g, '');
            domain.private_key = privateKey;
            // privateKey = privateKey.replace('-----BEGIN RSA PRIVATE KEY-----', '');
            // privateKey = privateKey.replace('-----END RSA PRIVATE KEY-----', '');
            publicKey = publicKey.replace(/(?:\\[rn]|[\r\n]+)+/g, '');
            domain.public_key = publicKey;
            publicKey = publicKey.replace('-----BEGIN PUBLIC KEY-----', '');
            publicKey = publicKey.replace('-----END PUBLIC KEY-----', '');

            var unixTimestamp = Math.round(new Date().getTime() / 1000);
            console.log(unixTimestamp);

            var rt = domain_name.split('.');
            var email_domain_1 = rt[rt.length - 2];
            // domain.dkim_host_name = unixTimestamp  + '.' + email_domain_1 + '._domainkey.' + req.body.domain;
            domain.dkim_host_name = 'queensmtp._domainkey.' + req.body.domain;
            domain.dkim_record = "v=DKIM1;p=" + publicKey;

            // domain.txt_will_record = make_spf_simple_record(domain.name, "", records);
            domain.save(function(err){
                if (err){
                    req.flash('error', err.toString());
                    return res.redirect(req.redirect.failure);
                }
                return res.redirect(req.redirect.success + '/' + domain._id.toString());
            });
        });
        makepub.stdout.setEncoding('ascii');
        makepub.stdin.write(privateKey);
        makepub.stdin.end();
    });
};

// function make_spf_simple_record(domain, db_records){
//     let record = "v=spf1 ";
//     for (let i = 0 ; i < db_records.length; i++) {
//         record += db_records[i].name + ' ';
//     }
//     record += "~all";
//     return record;
//
// }
function make_spf_simple_record(domain, domain_record, db_records){
    console.log('domain = ' + domain);
    console.log('domain_record = ' + domain_record);
    console.log(JSON.stringify(db_records));
    let to_record = domain_record;
    if (domain_record == ''){
        to_record = 'v=spf1 a mx a:' + domain + ' mx:' + domain;
        for (let i = 0; i < db_records.length; i++){
            to_record += ' ' + db_records[i].name;
        }
        to_record += ' ~all';
        return to_record;
    } else if (domain_record != ''){
        for (let i = 0 ; i < db_records.length; i++){
            let db_record = db_records[i].name;
            if (domain_record.indexOf(db_record) == -1){
                let last_index = to_record.lastIndexOf('~all');
                if (last_index != -1){
                    to_record = to_record.substring(0, last_index) + db_record + ' ~all';
                }
            }
        }
        return to_record;
    }
}
exports.getDomainDetail = async function(req, res, next){

    let id  =  req.params.id;

    var form = {},
        error = null,
        formFlash = req.flash('form'),
        errorFlash = req.flash('error');

    if (formFlash.length > 0) {
        form.email = formFlash[0].email;
    }
    if (errorFlash.length > 0) {
        error = errorFlash[0];
    }

    let err, domain;
    [err, domain] = await to (Domain.findOne({_id : id}));
    if (!domain){
        return res.render(req.render, {user: req.user});
    }
    if (domain.type == 1){
        let filePath = path.join(__dirname, '../public/html/verification.html');
        var htmldata  =  fs.readFileSync(filePath, 'utf8');
        var link= Secrets.server_host_address + "/domain/verify/email/" + domain._id.toString();
        htmldata = htmldata.replace('robertallen@company.com', domain.name);
        htmldata = htmldata.replace('https://example.com/activation', link);
        var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + domain.userid;
        htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
        htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');
        let mailerror, mailinfo;
        [mailerror, mailinfo] = await (mailer.sendEmail({
            from : '"QUEEN SMTP" <info@queensmtp.com>',
            to : [{ address: domain.name, name:""}],
            subject: 'Please verify your email address',
            html : htmldata
        }));

        if (mailinfo){
            req.flash('success', 'Sent email.');
            return res.redirect(req.redirect.success);
        }
        else {
            req.flash('error', 'Failed to send email. Please try to send email again.');
            return res.redirect(req.redirect.success);
        }

    }
    let records;
    [err, records] = await to (Record.find());

    let db_record = '';
    for (let i = 0 ; i < records.length; i++){
        db_record = records[i].name + ' ';
    }

    // return res.render(req.render, { user:req.user, domain: domain ,addr: '', record: domain.txt_will_record});
    dns.resolveTxt(domain.name, (err, addresses) => {
        let domain_spf_record = '';
        if (addresses != undefined)
        {
            for (let i = 0; i < addresses.length; i++) {
                let addr = addresses[i][0];
                if (addr.indexOf('spf') != -1) {
                    domain_spf_record = addr;
                }
            }
        }
        domain.txt_will_record = make_spf_simple_record(domain.name, domain_spf_record, records);

        let created;
        domain.save(function (err) {
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.render(req.render, { user:req.user, domain: domain ,addr: domain_spf_record, record: domain.txt_will_record});
    });
};
exports.getVerifyEmail = async function(req, res, next) {
    let d_id = req.params.id;
    let error, domain;
    [error, domain] = await to (Domain.findById(d_id));
    if (domain){
        domain.email_verified = true;
        let updated;
        [error, updated] = await to (domain.save());
        if (updated){
            req.flash('success', 'Success to verify ' + domain.name);
            return res.redirect(req.redirect.success);
        }
        else {
            req.flash('error', 'Failed to verify ' + domain.name);
            return res.redirect(req.redirect.failure);
        }
    }
    req.flash('error', 'Failed to verify email.');
    return res.redirect(req.redirect.failure);
};
exports.postVerifySPFDomain = async function(req, res, next) {
    let d_id = req.body.domain_id;
    let err, domain, record, records;
    [err, domain] = await to (Domain.findOne({_id : d_id}));

    if (!domain){
        return res.json({success: false, error:'Error While Getting Domain From Database'});
    }
    [err, records] = await to (Record.find());
    if (err || records.length <= 0){
        res.json({success: false, error:'There is no record on your database.'});
        return res.redirect(req.redirect.failure + '/' + d_id);
    }
    let db_record = '';

    for (let i = 0 ; i < records.length; i++){
        db_record += records[i].name + ' ';
    }

    dns.resolveTxt(domain.name, (err, addresses) => {
        console.log('spf record = ' + addresses.toString());
        if (addresses != undefined){
            for (let i = 0 ; i < addresses.length; i++){ //TOMODIFY addresses.length
                let addr = addresses[i][0];
                console.log('spf record = ' + addr);
                if (addr == domain.txt_will_record){
                    domain.spf_verified = true;
                }
            }
        }
        else{
            return res.json({success: false, error: 'Failed to get spf txt records form this domain. Please try again.'});
        }
        domain.save(function(err){
            if (err)
            {
                return res.json({success: false, error:'Failed to save domain information.'});
            }
            let msg = '';
            if (domain.spf_verified == false){
                msg += 'Failed to verify SPF Record. ';
            } else if (domain.spf_verified == true){
                msg += 'Success to verify SPF Record. ';
            }
            return res.json({success: true, msg: msg});
        });
    });
};

exports.postVerifyDKIMDomain = async function(req, res, next) {
    let d_id = req.body.domain_id;
    let err, domain, record, records;
    [err, domain] = await to (Domain.findOne({_id : d_id}));

    if (!domain){
        return res.json({success: false, error:'Error While Getting Domain From Database'});
    }
    [err, records] = await to (Record.find());
    if (err || records.length <= 0){
        res.json({success: false, error:'There is no record on your database.'});
        return res.redirect(req.redirect.failure + '/' + d_id);
    }
    let db_record = '';

    for (let i = 0 ; i < records.length; i++){
        db_record += records[i].name + ' ';
    }
    // console.log('domain = ' + domain.dkim_verified);
    // console.log('dkim_domain = ' + domain.dkim_host_name);
    dns.resolveTxt(domain.dkim_host_name, (err, dkim_address) => {
        let error_msg = '';
        console.log('error = ' + err);
        console.log('Dkim address = ' + dkim_address);
        if (dkim_address != undefined){
            let m_address = '';
            for (let i = 0 ; i < dkim_address.length; i++){ //TOMODIFY addresses.length
                for (let j = 0 ; j < dkim_address[i].length ; j++){
                    m_address += dkim_address[i][j];
                }
                // console.log('dkim log address = ' + m_address );
                // console.log('dkim saved record = ' + domain.dkim_record);
                if (m_address == domain.dkim_record){
                    domain.dkim_verified = true;
                }
            }
        }
        else
        {
            console.log('dkim_domain = ' + dkim_address);
            return res.json({success: false, error: 'Failed to get dkim record form this domain. Please try again.'});
        }
        domain.save(function(err){
            if (err)
            {
                return res.json({success: false, error:'Failed to save domain information.'});
            }
            let msg = '';
            if (domain.dkim_verified == true){
                msg += 'Success to verify DKIM Record. ';
            } else if (domain.dkim_verified == false){
                msg += 'Failed to verify DKIM Record. ';
            }
            return res.json({success: true, msg: msg});
        });
    });
};

exports.postGetDomain = async function(req, res, next) {
    let search = req.body.search.value;
    let start = req.body.start;
    let length = req.body.length;

    let err , results, count;
    let user_id = req.user._id.toString();
    let user_criteria = {}, user, error;
    [err, user] = await to (User.findById(user_id));
    if (err || !user){
        error = "Your user id is incorrect. Please try to login again.";
        return res.json({'error': error});
    };

    let regex = RegExp( search);
    if (user.role == 0){
        user_criteria ={ userid : user_id , $or: [{name : {$regex: regex}}]};
        [err, results] = await to (Domain.find(user_criteria).limit(length).skip(start));
    }
    else{
        user_criteria ={ $or: [{name : {$regex: regex}}]};
        [err, results] = await to (Domain.find(user_criteria).limit(length).skip(start).populate('userid'));
    }

    if (err)
        return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});

    [err, count] = await to (Domain.countDocuments(user_criteria));
    return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count, 'role' : user.role});
};
