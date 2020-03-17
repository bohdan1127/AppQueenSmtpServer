'use strict';

let User = require('../models/user');
let Activation = require('../models/activation');
let Count = require('../models/count');
let SmtpServer =require('./../models/smtp_server');
let Generator = require('generate-password');
let Secrets = require('../config/secrets');
let Setting = require('../models/setting');
let SendDomain = require('../models/senddomain');
let LogEmail = require('../models/log_email');
let Domain = require('../models/domain');
let Email = require('../models/email');
let Emailto = require('../models/emailto');
let Usersmtp = require('../models/usersmtp');
let LogStripeActivity = require('../models/log_stripe_activity');
let MStripe = require('../models/stripe');
let Rate = require('../models/rate');
let LogActivity = require('../models/log_activity');
let LogSmtp = require('../models/log_smtp');
let Redirect = require('../models/redirect');
let Unsubscribe = require('../models/unsubscribe');
let BounceEmailCount = require('../models/bounce_email_count');

var cp = require('child_process'), assert = require('assert');
const dns = require('dns');

let fs = require('fs');
var path = require('path');
const {check, oneOf, validationResult}= require('express-validator');
const { to , ReE , ReS} = require('./../utils/util');
let mailer = require('./../utils/mailer');
let plans = User.getPlans();
let crypto = require('crypto');
// show user page

exports.intercept = async function(req, res, next){
  var ua = req.headers['user-agent'];

  // if (req.isAuthenticated())
  // {
  //   let user = req.user;
  //   let ip_add =  req._remoteAddress;
  //   let error, address;
  //   [error, address] = await to (AccessAddress.findOne({userid: user._id.toString(),ip_address: ip_add }));
  //
  //   if (error || !address)
  //   {
  //     let a_address = new AccessAddress({userid: user._id, ip_address: ip_add, mDate: new Date()});
  //     let updated;
  //     [error, updated] = await to (a_address.save());
  //   }
  // }
  next()
};


exports.getProfile = async function(req, res, next){
  var form = {},
      error = null,
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');

  if (formFlash.length) {
    form.email = formFlash[0].email;
  }
  if (errorFlash.length) {
    error = errorFlash[0];
  }

  let err, user;
  [err, user] = await to (User.findById(req.user.id));
  res.render('dashboard/profile', {user: user, form: form, error: error, plans: plans});
};

// Updates generic profile information
exports.postProfile = function(req, res, next){

  var errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  if(req.body.email != req.user.email){
    User.findOne({ email: req.body.email }, function(err, existingUser) {
      if (existingUser) {
        req.flash('errors', { msg: 'An account with that email address already exists.' });
        return res.redirect(req.redirect.failure);
      } else {
        User.findById(req.user.id, function(err, user) {
          if (err) return next(err);
          user.email = req.body.email || '';
          user.profile_firstname = req.body.firstname || '';
          user.profile_lastname = req.body.lastname || '';
          user.billing_address.address1 = req.body.address1 || '';
          user.billing_address.city = req.body.city || '';
          user.billing_address.state = req.body.state || '';
          user.billing_address.postal = req.body.postal || '';
          user.billing_address.country = req.body.country || '';

          user.save(function(err) {
            if (err) return next(err);
            user.updateStripeEmail(function(err){
              if (err) return next(err);
              req.flash('success', { msg: 'Profile information updated.' });
              res.redirect(req.redirect.success);
              // res.redirect('/logout');
            });
          });
        });
      }
    });
  } else {
    User.findById(req.user.id, function(err, user) {
      if (err) return next(err);
      user.profile_firstname = req.body.firstname || '';
      user.profile_lastname = req.body.lastname || '';
      user.billing_address.address1 = req.body.address1 || '';
      user.billing_address.city = req.body.city || '';
      user.billing_address.state = req.body.state || '';
      user.billing_address.postal = req.body.postal || '';
      user.billing_address.country = req.body.country || '';

      user.save(function(err) {
        if (err) return next(err);
        user.updateStripeEmail(function(err){
          if (err) return next(err);
          req.flash('success', { msg: 'Profile information updated.' });
          req.user = user;
          res.redirect(req.redirect.success);
          //res.redirect('/logout');
        });
      });
    });
  }
};

// Removes account
exports.deleteAccount = function(req, res, next){
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.remove(function (err, user) {
      if (err) return next(err);
      user.cancelStripe(function(err){
        if (err) return next(err);

        req.logout();
        req.flash('info', { msg: 'Your account has been deleted.' });
        res.redirect(req.redirect.success);
      });
    });
  });
};
exports.postAdminDeleteAccount = async function(req, res, next){
  let id1 = req.body.userid;
  let error, user;
  let result;
  [error ,user] = await to (User.findById(id1));
  let id = user._id;
  //TODO user remove

  [error, result] = await to (Activation.deleteMany({userid: id}));
  [error, result] = await to (Count.deleteMany({userid: id}));
  [error, result] = await to (Domain.deleteMany({userid: id}));
  [error, result] = await to (LogActivity.deleteMany({userid: id}));
  [error, result] = await to (LogEmail.deleteMany({userid: id}));
  [error, result] = await to (LogStripeActivity.deleteMany({userid: id}));
  [error, result] = await to (Rate.deleteMany({userid: id}));
  [error, result] = await to (MStripe.deleteMany({userid: id}));
  [error, result] = await to (Usersmtp.deleteMany({userid: id}));
  [error, result] = await to (LogSmtp.deleteMany({userid: id}));
  [error, result] = await to (Email.deleteMany({userid: id}));
  [error, result] = await to (Emailto.deleteMany({userid: id}));
  [error, result] = await to (Redirect.deleteMany({userid: id}));
  [error, result] = await to (Unsubscribe.deleteMany({userid: id}));


  if (user){
    let results;
    [error, results] = await to (user.delete());
    if (results.ok == 1){
      //TODO
      let [error] = await to (user.cancelStripe());
      if (error == null){
      }
    }
  }
  req.flash('success', 'Success to delete user');
  return res.redirect(req.redirect.success);
};
// Adds or updates a users card.

exports.postBilling = function(req, res, next){
  var stripeToken = req.body.stripeToken;

  if(!stripeToken){
    req.flash('errors', { msg: 'Please provide a valid card.' });
    return res.redirect(req.redirect.failure);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.setCard(stripeToken, function (err) {
      if (err) {
        if(err.code && err.code == 'card_declined'){
          req.flash('errors', { msg: 'Your card was declined. Please provide a valid card.' });
          return res.redirect(req.redirect.failure);
        }
        req.flash('errors', { msg: 'An unexpected error occurred.' });
        return res.redirect(req.redirect.failure);
      }
      req.flash('success', { msg: 'Billing has been updated.' });
      res.redirect(req.redirect.success);
    });
  });
};
exports.setUserPlanFree =async function(req, res, next){
  let id =  req.user._id.toString();
  let error, user;
  [error, user] = await to (User.findById(id));

  let updated;
  user.stripe.plan = "free";
  [error, updated] = await to (user.save());
  if (error)
    return res.redirect(req.redirect.failure);

  return res.redirect(req.redirect.success);
};
exports.postPlan = function(req, res, next){
  var plan = req.body.plan;
  if (plan == "free")
  {
    return res.redirect(req.redirect.failure);
  }
  var stripeToken = null;

  if(plan){
    plan = plan.toLowerCase();
  }

  if(req.user.stripe.plan == plan && req.user.subscription != undefined && req.user.subscription != 0){
    req.flash('info', {msg: 'The selected plan is the same as the current plan.'});
    return res.redirect(req.redirect.success);
  }

  if(req.body.stripeToken){
    stripeToken = req.body.stripeToken;
  }

  if(!req.user.stripe.last4 && !req.body.stripeToken){
    req.flash('errors', {msg: 'Please add a card to your account before choosing a plan.'});
    return res.redirect(req.redirect.failure);
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.setPlan(plan, stripeToken, function (err) {
      var msg;

      if (err) {
        if(err.code && err.code == 'card_declined'){
          msg = 'Your card was declined. Please provide a valid card.';
        } else if(err && err.message) {
          msg = err.message;
        } else {
          msg = 'An unexpected error occurred.';
        }

        req.flash('errors', { msg:  msg});
        return res.redirect(req.redirect.failure);
      }
      let mPlan = plans[plan];
      Count.findOne({userid: req.user._id}, function(err, count){
        if (err || !count){
          count = new Count({userid : req.user._id, total_count: mPlan.count, sent_count: 0});
        }
        else {
          count.total_count = mPlan.count;
          count.sent_count = 0;
        }
        count.save(function(err){
          if (!err){
            req.flash('success', { msg: 'Plan has been updated.' });
            res.redirect(req.redirect.success);
          }
        });
      });

    });
  });
};
exports.setChargeEmailsForUser = function(){

};
exports.getSMTP = async function(req, res, next){
  var form = {},
      error = null,
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');

  if (formFlash.length) {
    form.email = formFlash[0].email;
  }
  if (errorFlash.length) {
    error = errorFlash[0];
  }
  //For test //TODO
  let host = req.get('host');
  host = host.split(':');
  if (host.length > 0){
    host = host[0];
  }
  // let host = req.connection.localAddress;
  // host = host.substring(7);
  let user, err;
  [err, user] = await to (User.findById(req.user._id.toString()));
  let is_generated = false;
  if (user){
    is_generated = user.smtp_password_generated;
  }
  res.render(req.render, {user: req.user, host: 'smtp.queensmtp.com' ,  port : Secrets.my_smtp_options.port,  encryption: Secrets.my_smtp_options.encryption,
    username: req.user.smtp_username, userpass : req.user.smtp_userpass, generated: is_generated, form: form, error: error, });
};
exports.postGenPwd = async function(req, res, next){
  let user_id = req.user._id.toString();
  let newPwd = Generator.generate({
    length: 10, numbers: true
  });
  let error, user;
  if (newPwd != ""){
    [error, user] = await to (User.findById(user_id));
    if (error){
      req.flash('error', 'Error while getting user from db.');
      return res.redirect(req.redirect.failure);
    }
    if (!user){
      req.flash('error', 'Current User does not exist.');
      return res.redirect(req.redirect.failure);
    }
    user.smtp_userpass = newPwd;
    user.smtp_password_generated = true;
    let result;
    [error, result] = await to (user.save());

    if (error || result.ok != 1){
      req.flash('error', 'Failed to save user.');
      return res.redirect(req.redirect.failure);
    }
    if (result.ok == 1){
      req.flash('error', 'Success generating new password.');
      req.user = user;
      return res.redirect(req.redirect.failure);
    }
  }
};
exports.sendSuspendEmail = async function(user){
  let filePath = path.join(__dirname, '../public/html/suspend_account.html');
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
    if (!err) {
      let htmldata = data.toString();
      var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + + user._id.toString();
      htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
      htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');

      mailer.sendEmail({
        from : '"QUEEN SMTP" <info@queensmtp.com>',
        to : [{ address: user.email, name:""}],
        subject: 'You Account is Suspend Contact Us to Active',
        html : htmldata
      }, function(err, info){
        console.log("Sent Successfully.")
      });
    }
  });
};
exports.sendReviewEmail = async function(user){
  let filePath = path.join(__dirname, '../public/html/review_account.html');
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
    if (!err) {
      let htmldata = data.toString();
      var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
      htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
      htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');

      mailer.sendEmail({
        from : '"QUEEN SMTP" <info@queensmtp.com>',
        to : [{ address: user.email, name:""}],
        subject: 'You Account is Under Review Contact Us to Active',
        html : htmldata
      }, function(err, info){
        console.log("Sent Successfully.")
      });
    }
  });
};
exports.postSendEmailToVerify = async function(req, res, next){
  let user_id = req.body.user_id;
  let err1, user;
  [err1, user] = await to (User.findById(user_id));

  if (err1){
    return res.json({success: false, msg:'Failed to get User'});
  }
  if (user && !user.unsubscribed){
    let email = user.email;
    let activation;
    [err1, activation] = await to (Activation.findOne({user_id: user_id}));
    if (err1 || !activation){
      activation = new Activation({userid : user._id});
    }
    crypto.randomBytes(20, function (err, buf) {
      activation.activeToken = buf.toString('hex');
      activation.activeExpires = Date.now() + 24 * 3600 * 100;
      activation.save(function(err){
        if (err) return done(err, false, req.flash('error', 'Error saving activation code.'));
        let filePath = path.join(__dirname, '../public/html/verification.html');
        fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
          if (!err) {
            let htmldata = data.toString();
            let link= Secrets.server_host_address + "/user/activate/" + activation.activeToken;
            htmldata = htmldata.replace('robertallen@company.com', user.email);
            var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
            htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
            htmldata = htmldata.replace('https://example.com/activation', link);
            htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');

            mailer.sendEmail({
              from : '"QUEEN SMTP" <info@queensmtp.com>',
              to : [{ address: email, name:""}],
              subject: 'Thank You for Sign Up QUEENSMTP.COM',
              html : htmldata
            }, function(err, info){
              if (err){
                return res.json({success: false,errortype: 0, error: err});
              } else {
                return res.json({success: true});
              }
            });
          }
        });

      });
    });
  } else if (user.unsubscribed){
    return res.json({success: false, errortype: 1, error: 'You are unsubscribed.'});
  }
};
exports.postSmtpDomainVerified = async function(req, res, next){
  let smtp_id = req.body.smtpserver_id;
  let smtp, error;
  [error, smtp] = await to (SmtpServer.findById(smtp_id));
  if (error){
    return res.json({success: false, error: 'Error while getting smtp server domain from database.'});
  }
  let domain_name = smtp.domain;
  dns.resolveTxt(smtp.dkim_host_name, (err, dkim_address) => {
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
        if (m_address == smtp.dkim_record){
          smtp.dkim_verified = true;
        }
      }
    }
    else
    {
      console.log('dkim_domain = ' + dkim_address);
      return res.json({success: false, error: 'Failed to get dkim record form this domain. Please try again.'});
    }

    if (smtp.dkim_verified == false) {
      return res.json({success: false, error: 'Failed to verify dkim.'})
    }
    smtp.save(function(err){
      if (err)
      {
        return res.json({success: false, error:'Failed to save domain information.'});
      }
      let msg = '';
      //req.flash('success', 'Success to verify domain');
      //return res.redirect(req.redirect.success);
      return res.json({success: true, msg: 'Success'})
    });
  });
};
exports.getAdminSmtps = async function(req, res, next){
  var form = {},
      error = null,
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');

  if (formFlash.length > 0) {
    form.host = formFlash[0].host;
    form.port = formFlash[0].port;
    form.encryption = formFlash[0].encryption;
    form.username = formFlash[0].username;
    form.userpass = formFlash[0].userpass;
    form.is_trial = formFlash[0].is_trial;
    form.daily_count = formFlash[0].daily_count;
    form.monthly_count = formFlash[0].monthly_count;
    form.name = formFlash[0].name;
    form.domain = formFlash[0].domain;
    form.status = formFlash[0].status;
    if (formFlash[0]._id != undefined)
      form.id = formFlash[0]._id.toString();
  }

  if (errorFlash.length) {
    error = errorFlash[0];
  }

  return res.render(req.render, {user:req.user, form: form, error: error});
};
exports.postAdminSmtpAddOrEdit = async function(req, res, next){
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  let id = req.body.id;
  let err;
  let smtpserver, created;
  if (id == ""){
    let m_smtpserver;
    [err, m_smtpserver] = await to (SmtpServer.findOne({host: req.body.host}));
    if (err){
      req.flash('error', 'Error checking');
      req.flash('form', req.body);
      return res.redirect(req.redirect.failure);
    }
    if (m_smtpserver){
      req.flash('error', 'Smtp Host already exist.');
      req.flash('form', req.body);
      return res.redirect(req.redirect.failure);
    }
    smtpserver = new SmtpServer();
  } else {
    [err, smtpserver] = await to (SmtpServer.findById(id));
    if (err){
      req.flash('error', 'Does not exist.');
      req.flash('form', smtpserver);
      return res.redirect(req.redirect.failure);
    }
  }
  smtpserver.host = req.body.host;
  smtpserver.port = req.body.port;
  smtpserver.encryption = req.body.encryption;
  smtpserver.username = req.body.username;
  smtpserver.userpass = req.body.userpass;
  smtpserver.daily_count = req.body.daily_count;
  smtpserver.monthly_count = req.body.monthly_count;
  smtpserver.name = req.body.name;
  let origin_domain = smtpserver.domain;
  smtpserver.domain = req.body.domain;


  if (req.body.is_trial == "on"){
    smtpserver.is_trial = true;
  } else {
    smtpserver.is_trial = false;
  }
  if (req.body.status == "on"){
    smtpserver.status = true;
  } else {
    smtpserver.status = false;
  }
  [err ,created] =await to (smtpserver.save());

  if (err || !created){
    req.flash('error', 'Failed to save.');
    req.flash('form', smtpserver);
    res.redirect(req.redirect.failure);
  }
  if (origin_domain !=req.body.domain)
  {
    var privateKey, publicKey;
    publicKey = '';
    cp.exec('openssl genrsa 1024', function(err, stdout, stderr) {
      assert.ok(!err);
      privateKey = stdout;
      console.log(privateKey);
      let makepub = cp.spawn('openssl', ['rsa', '-pubout']);
      makepub.on('exit', function(code) {
        assert.equal(code, 0);
      });
      makepub.stdout.on('data', function(data) {
        publicKey += data;
        smtpserver.dkim_private_key = privateKey;
        // privateKey = privateKey.replace(/(?:\\[rn]|[\r\n]+)+/g, '');
        publicKey = publicKey.replace(/(?:\\[rn]|[\r\n]+)+/g, '');
        publicKey = publicKey.replace('-----BEGIN PUBLIC KEY-----', '');
        publicKey = publicKey.replace('-----END PUBLIC KEY-----', '');
        var unixTimestamp = Math.round(new Date().getTime() / 1000);
        console.log(unixTimestamp);


        var rt = smtpserver.domain.split('.');
        var email_domain_1 = rt[rt.length - 2];
        // domain.dkim_host_name = unixTimestamp  + '.' + email_domain_1 + '._domainkey.' + req.body.domain;
        smtpserver.dkim_host_name = 'queensmtp._domainkey.' + smtpserver.domain;
        smtpserver.dkim_record = "v=DKIM1;p=" + publicKey;

        // domain.txt_will_record = make_spf_simple_record(domain.name, "", records);
        smtpserver.save(function(err){
          if (err){
            req.flash('error', err.toString());
            return res.redirect(req.redirect.failure);
          }
          else {
            req.flash('success', 'Success to add external smtp server.');
            return res.redirect(req.redirect.success);
          }
        });
      });
      makepub.stdout.setEncoding('ascii');
      makepub.stdin.write(privateKey);
      makepub.stdin.end();
    });
  }
  else
  {
    req.flash('success', 'Success to add external smtp server.');
    return res.redirect(req.redirect.success);
  }

};

exports.postAdminSmtpDel = async function(req, res, next){
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  let smtpId = req.body.smtp_id;
  let err, record;
  [err, record] = await to (SmtpServer.findById(smtpId));

  if (err){
    req.flash('error', 'Failed to delete smtp info.');
    res.redirect(req.redirect.failure);
  }

  if (!record){
    req.flash('error', 'There is no smtp info.');
    return res.redirect(req.redirect.failure);
  }

  let result;
  [err, result] = await to (SmtpServer.deleteOne({_id: smtpId}));

  if (result.ok != 1 || err){
    req.flash('error', 'Failed to delete smtp server.');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', { msg: 'Success to delete smtp server.' });
  return res.redirect(req.redirect.success);
};
exports.postGetSmtpById = async function(req, res, next){
  let id = req.body.smtpid;
  let err,smtp;
  [err, smtp] = await to (SmtpServer.findById(id));
  if (err){
    return res.json({success: false, msg: err.toString()});
  }
  return res.json({success:true, data: JSON.stringify(smtp)});
};

exports.postAdminSmtps = async function(req, res, next){
  let search = req.body.search.value;
  let start = req.body.start;
  let length = req.body.length;
  let err , results, count;
  let regex = RegExp( search);
  let criteria = {$or: [{host : {$regex: regex}}, {name : {$regex: regex}}, {username : {$regex: regex}}]};
  [err, results] = await to (SmtpServer.find(criteria).limit(length).skip(start));
  if (err)
    return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});

  [err, count] = await to (SmtpServer.countDocuments(criteria));
  return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count});
};

exports.getAdminSmtpsEdit = async function(req, res, next){
  let id = req.params.id;
  let err , smtpserver;
  [err, smtpserver] = await to (SmtpServer.findById(id));
  if (err){
    req.flash('error', 'Does not exist.');
    req.flash('form', smtpserver);
    return res.redirect(req.redirect.failure);
  }
  req.flash('form', smtpserver);
  return res.redirect(req.redirect.success);
};

exports.getSendDomain = async function(req, res, next){
  let form = {},
      error = null,
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');

  if (formFlash.length) {
    form.email = formFlash[0].email;
  }
  if (errorFlash.length) {
    error = errorFlash[0];
  }
  return res.render(req.render, {user:req.user, form: form, error: error, });
};
exports.postAdminSendDomains = async function(req, res, next){
  let search = req.body.search.value;
  let start = req.body.start;
  let length = req.body.length;
  let err , results, count;
  let regex = RegExp( search);
  [err, results] = await to (SendDomain.find({$or: [{name : {$regex: regex}}]}).limit(length).skip(start));
  if (err)
    return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});

  [err, count] = await to (SendDomain.countDocuments({$or: [{name : {$regex: regex}}]}));
  return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count});
};
exports.postAddSendDomain = async function(req, res, next){
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  let err, created, existing;
  let domain_name = req.body.domain;
  domain_name = domain_name.replace(/ /g, "");
  [err, existing] = await to (SendDomain.findOne({name : domain_name}));
  if (existing || err){
    req.flash('error', 'This domain already exists.');
    return res.redirect(req.redirect.failure);
  }

  let record = new SendDomain();
  record.name = req.body.domain;
  [err, created] = await to (record.save());
  if (err){
    req.flash('error', 'Failed to add new record');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', { msg: 'Success to add record.' });
  return res.redirect(req.redirect.success);
};

exports.postSendDomainDelete = async function(req, res, next){
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  let record_id = req.body.domain_id;
  let err, record;
  [err, record] = await to (SendDomain.findById(record_id));

  if (err){
    req.flash('error', 'Failed to delete record');
    res.redirect(req.redirect.failure);
  }

  if (!record){
    req.flash('error', 'There is no record.');
    return res.redirect(req.redirect.failure);
  }

  let result;
  [err, result] = await to (SendDomain.deleteOne({_id: record_id}));

  if (result.ok != 1 || err){
    req.flash('error', 'Failed to delete record.');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', { msg: 'Success to delete record.' });
  return res.redirect(req.redirect.success);
};
exports.getAdminUsers = async function (req, res, next) {
  var form = {},
      error = null,
      formFlash = req.flash('form'),
      smtps = req.flash('smtps'),
      errorFlash = req.flash('error');
  let err, smtpservers;
  [err, smtpservers] = await to (SmtpServer.find({}));

  if (formFlash.length) {
    form.email = formFlash[0].email;
    form.daily_count = formFlash[0].daily_count;
    form.hourly_count = formFlash[0].hourly_count;
    form.status = formFlash[0].status == 0 ? 'active' : formFlash[0].status == 1 ? 'underreview' : 'suspend';
    form.unsubscribe_link = formFlash[0].unsubscribe_link;
    form.smtpids = [];
    for (let i = 0 ; i < smtps.length; i++){
      form.smtpids.push(smtps[i].smtpserver_id);
    }
    form.id = formFlash[0]._id.toString();
  }
  if (errorFlash.length) {
    error = errorFlash[0];
  }
  res.render(req.render, {user: req.user, form: form, smtpserver: smtpservers, error: error});
};
exports.getAdminSetting = async function (req, res, next) {

  let error, setting;
  [error, setting] = await to (Setting.findOne({}));
  if (error || !setting){
    setting = new Setting();
    [error, setting] = await to (setting.save());
  }
  var form = {},
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');

  if (formFlash.length) {
  }
  if (errorFlash.length) {
    error = errorFlash[0];
  }
  res.render(req.render, {user: req.user, form: form, setting: setting, error: error});
};
exports.postSaveSetting = async function (req, res, next) {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  let error, setting;
  [error, setting] = await to (Setting.findOne({}));
  if (error || !setting){
    setting = new Setting();
    [error, setting] = await to (setting.save());
  }
  setting.open_limit_rate = req.body.open_limit_rate;
  setting.click_limit_rate = req.body.click_limit_rate;
  setting.bounce_limit_rate = req.body.bounce_limit_rate;
  setting.unsubscribe_limit_rate = req.body.unsubscribe_limit_rate;
  setting.new_send_count = req.body.new_send_count;
  setting.emails_per_second = req.body.emails_per_second;
  if (req.body.send_open_link == "on"){
    setting.send_open_link = true;
  } else {
    setting.send_open_link = false;
  }
  if (req.body.send_click_link == "on"){
    setting.send_click_link = true;
  } else {
    setting.send_click_link = false;
  }
  if (req.body.send_unsubscribe_link == "on"){
    setting.send_unsubscribe_link = true;
  } else {
    setting.send_unsubscribe_link = false;
  }
  let updated;
  [error, updated] = await to (setting.save());
  if (error){
    req.flash('error', 'Error while saving setting.');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', 'Success to save setting');
  return res.redirect(req.redirect.success);
};
exports.postGetEmailBody = async function(req, res, next){
  let email_id = req.body.id;
  let error, result;
  [error, result ] = await to (Email.findById(email_id));
  if (result){
    return res.json({success: true, msg: result.html_content})
  }
  return res.json({success: false, msg: 'Failed to get email'});
};
exports.postAdminGetUserEmails = async function (req, res, next) {
  let userid = req.body.id;
  let search = req.body.search.value;
  let start = req.body.start;
  let length = req.body.length;
  let status = req.body.status;
  let err , results, count;
  //[err, results] = await to (Email.find({}).limit(length).skip(start).populate('dest'));
  let regex = RegExp( search);
  let criteria = {userid: userid, $or: [{name : {$regex: regex}},
      {body_html : {$regex: regex}}, {subject : {$regex: regex}}]};

  if (status == 1){
    criteria['sent'] = 1;
  } else if (status == 2){
    criteria['sent'] = 0
  } else if (status == 3){
    criteria['unsubscribe_status'] = 1;
    criteria['sent'] = 1;
  } else if (status == 4){
    criteria['bounce_status'] = 1;
  }


  [err, results] = await to (Email.find(criteria).limit(length).skip(start).populate('destaddr').populate('userid'));

  if (err)
    return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});

  [err, count] = await to (Email.countDocuments(criteria));
  return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count});
};
exports.getAdminUserEdit = async function (req, res, next) {
  let userid = req.params.id;
  let err , user;
  [err, user] = await to (User.findById(userid).populate('destsmtps'));
  if (err){
    req.flash('error', 'Does not exist.');
    req.flash('form', user);
    return res.redirect(req.redirect.failure);
  }
  let array = user.destsmtps;
  req.flash('form', user);
  req.flash('abcdef', 'abcdef');
  if (array.length > 0)
    req.flash('smtps', array);
  return res.redirect(req.redirect.success);
};
exports.getAdminUserDetail = async function (req, res, next) {
  let userid = req.params.id;
  let err , user;
  [err, user] = await to (User.findById(userid));
  if (err){
    req.flash('error', 'Does not exist.');
    req.flash('form', user);
    return res.redirect(req.redirect.failure);
  }

  let error, rate;
  let totalCount = 0, open_count = 0, click_count = 0, m_bounce_count = 0, d_bounce_count = 0, d_unsubscribe_count = 0, m_unsubscribe_count = 0, report_count = 0, total_send_count = 0 , total_queue_count = 0;

  let nowDate = new Date();
  let beforeDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  let afterDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1);
  let beforeMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth());
  let afterMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1);

  let open_rate = 0;
  let click_rate = 0;
  let bounce_rate = 0;
  let unsubscribe_rate = 0;
  let report_rate = 0;
  let m_open_rate = 0;
  let m_click_rate = 0;
  let m_bounce_rate = 0;
  let m_unsubscribe_rate = 0;
  let m_report_rate = 0;
  let d_totalCount = 1;
  [error, totalCount] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  d_totalCount = totalCount;

  [error, open_count] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), open_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, click_count] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), click_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, d_bounce_count] = await to (Email.countDocuments({userid: user._id.toString(), bounce_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  let d_email_bounce_count;
  [error, d_email_bounce_count] = await to (BounceEmailCount.countDocuments({userid: user._id.toString(), updatedDate: { $gte : beforeDate, $lte: afterDate}}));
  d_bounce_count += d_email_bounce_count;
  [error, d_unsubscribe_count] = await to (Email.countDocuments({userid: user._id.toString(), unsubscribe_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, report_count] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), report_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  if (totalCount > 0){
    open_rate = Math.round(open_count * 100 / totalCount);
    click_rate = Math.round(click_count * 100 / totalCount);
    bounce_rate = Math.round(d_bounce_count * 100 / totalCount);
    unsubscribe_rate = Math.round(d_unsubscribe_count * 100 / totalCount);
    report_rate = Math.round(report_count * 100 / totalCount);

  }
  [error, totalCount] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));


  [error, open_count] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), open_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, click_count] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), click_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, m_bounce_count] = await to (Email.countDocuments({userid: user._id.toString(), bounce_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  let m_email_bounce_count;
  [error, m_email_bounce_count] = await to (BounceEmailCount.countDocuments({userid: user._id.toString(),updatedDate: { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  m_bounce_count += m_email_bounce_count;
  [error, m_unsubscribe_count] = await to (Email.countDocuments({ userid: user._id.toString(), unsubscribe_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, report_count] = await to (Email.countDocuments({sent: 1,userid: user._id.toString(), report_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  if (totalCount > 0){
    m_open_rate = Math.round(open_count * 100 / totalCount);
    m_click_rate = Math.round(click_count * 100 / totalCount);
    m_bounce_rate = Math.round(m_bounce_count * 100 / totalCount);
    m_unsubscribe_rate = Math.round(m_unsubscribe_count * 100 / totalCount);
    m_report_rate = Math.round(report_count * 100 / totalCount);

  }
  let total_unsubscribe_count;
  [error, total_unsubscribe_count] = await to (Email.countDocuments({userid: user._id.toString(), unsubscribe_status : 1}));
  [error, report_count] = await to (Email.countDocuments({userid: user._id.toString(), report_status : 1}));
  [error, total_send_count] = await to (Email.countDocuments({userid: user._id.toString(), sent : 1}));
  [error, total_queue_count] = await to (Email.countDocuments({userid: user._id.toString(), sent : 0}));

  res.render(req.render, {user: req.user, d_open: open_rate, d_click: click_rate, d_bounce: d_bounce_count,
    d_unsubscribe: d_unsubscribe_count,m_open: m_open_rate, m_click: m_click_rate, m_bounce: m_bounce_count,
    m_unsubscribe: m_unsubscribe_count, m_totalCount:totalCount , d_totalCount: d_totalCount, id: userid, unsubscribe_count: total_unsubscribe_count,
    report_count: report_count, total_send_count: total_send_count, total_queue_count: total_queue_count
  });

};
exports.postAdminUsers = async function (req, res, next) {
  let search = req.body.search.value;
  let paid = req.body.paid;
  let status = req.body.status;

  let start = req.body.start;
  let length = req.body.length;
  let err , results, count;
  let regex = RegExp( search);
  let criteria;

  if (paid == ""){
    criteria = {$or: [{email : {$regex: regex}},
        {profile_firstname : {$regex: regex}}]};
  } else {
    let n = parseInt(paid);
    criteria = {$or: [{email : {$regex: regex}},
        {profile_firstname : {$regex: regex}}], payment_status : n};
  }

  if (status != ""){
    let n = parseInt(status);
    criteria["status"] = n;
  }
  //[err, results] = await to (User.find({}).limit(length).skip(start).populate("smtpid"));
  [err, results] = await to (User.find(criteria).limit(length).skip(start));
  if (err)
    return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});

  [err, count] = await to (User.countDocuments(criteria));
  return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count});
};
exports.postAdminUserSuspend= async function (req, res, next) {
  let id = req.body.user_id;
  let err, user;
  [err, user] = await to (User.findById(id));
  if (err){
    req.flash('error', 'Failed to get user while suspending user');
    return res.redirect(req.redirect.failure);
  }
  if (!user){
    req.flash('error', 'User does not exist.');
    return res.redirect(req.redirect.failure);
  }
  module.exports.sendReviewEmail(user);
  user.status = 2;
  let saved;
  [err, saved] = await to (user.save());
  if (err || !saved){
    req.flash('error', 'Failed to update user status.');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', 'Success to user suspend');
  return res.redirect(req.redirect.success);
};
exports.postAdminUserUpdate  = async function (req, res, next) {
  let id = req.body.user_id;
  let err, user;
  [err, user] = await to (User.findById(id));
  if (err){
    req.flash('error', 'Failed to get user while suspending user');
    return res.redirect(req.redirect.failure);
  }
  if (!user){
    req.flash('error', 'User does not exist.');
    return res.redirect(req.redirect.failure);
  }

  user.hourly_count = req.body.hourly_count;
  user.daily_count = req.body.daily_count;
  if (req.body.unsub_link == "on"){
    user.unsubscribe_link = true;
  } else {
    user.unsubscribe_link = false;
  }

  if (req.body.status_str == "active"){
    let rate, err;
    [err, rate] = await to (Rate.findOne({userid: user._id}));
    if (rate){
      rate.open_rate = 0;
      rate.click_rate = 0;
      rate.bounce_rate = 0;
      rate.unsubscribe_rate = 0;
      rate.report_rate = 0;
      rate.updateDate = new Date();
      let updated;
      [err, updated] = await to (rate.save());
    }
    user.status = 0;
    user.activate = true;
  } else if (req.body.status_str == "underreview"){
    user.status = 1;
    module.exports.sendReviewEmail(user);
  } else if (req.body.status_str == "suspend"){
    user.status = 2;
    module.exports.sendSuspendEmail(user);
  }
  let error, result;

  [error, result] = await to (Usersmtp.deleteMany({userid: id}));

  if (error || result.ok != 1){
    req.flash('error', 'Failed to update user smtps.');
    return res.redirect(req.redirect.failure);
  }

  let type = typeof req.body.smtpserver;
  if (req.body.smtpserver != undefined){
    let saved_usersmtp;
    if ((typeof req.body.smtpserver) == "string"){
      let usersmtp = new Usersmtp({userid: id, smtpserver_id: req.body.smtpserver});
      [error, saved_usersmtp] = await to (usersmtp.save());
    }
    else if (type == "object"){
      for (let i = 0 ; i < req.body.smtpserver.length; i++){
        let usersmtp = new Usersmtp({userid: id, smtpserver_id: req.body.smtpserver[i]});
        [error, saved_usersmtp] = await to (usersmtp.save());
      }
    }

  }


  let saved;
  [err, saved] = await to (user.save());
  if (err || !saved){
    req.flash('error', 'Failed to update user status.');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', 'Success to update');
  return res.redirect(req.redirect.success);
};
exports.postAdminUserActive = async function (req, res, next) {
  let id = req.body.user_id;
  let err, user;
  [err, user] = await to (User.findById(id));
  if (err){
    req.flash('error', 'Failed to get user while suspending user');
    return res.redirect(req.redirect.failure);
  }
  if (!user){
    req.flash('error', 'User does not exist.');
    return res.redirect(req.redirect.failure);
  }
  user.status = 0;
  let saved;
  [err, saved] = await to (user.save());
  if (err || !saved){
    req.flash('error', 'Failed to update user status.');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', 'Success to user suspend');
  return res.redirect(req.redirect.success);
};

exports.getUnsubscribe = async function(req, res, next) {
  let id = req.params.id;
  let form = {},
      error = null,
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');
  let err, user;
  if (formFlash.length) {
    form.email = formFlash[0].email;
  }
  [err, user] = await to(User.findById(id));
  if (user) {
    user.unsubscribed = true;
    let updated_user;
    [err, updated_user] = await to(user.save());

    if (updated_user) {
      req.flash('success', 'Success to make you unsubscribe.');
      res.render(req.render, {form: form, error: error, unsubscribed: true})
    } else {
      req.flash('true', 'Failed to make you unsubscribe.');
      res.render(req.render, {form: form, error: error, unsubscribed: false})
    }
  }
};