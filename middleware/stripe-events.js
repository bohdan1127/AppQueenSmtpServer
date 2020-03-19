'use strict';

var User = require('../models/user');
let LogStripeActivity = require('../models/log_stripe_activity');
let MStripe = require('../models/stripe');
let Count = require('../models/count');
const { to , ReE , ReS} = require('./../utils/util');
let mailer = require('./../utils/mailer');
let Secrets = require('../config/secrets');
let fs = require('fs');
var path = require('path');

var knownEvents = {
  'account.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'account.application.deauthorized': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'application_fee.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'application_fee.refunded': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'balance.available': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'charge.succeeded': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    let user, error, err, count;
    console.log("Customer Event Data = " + JSON.stringify(req.stripeEvent));

    // let customer_id = req.stripeEvent.data.object.id;
    let customer_id = req.stripeEvent.custom;
    console.log("Customer ID = " + req.stripeEvent.customer);
    [error, user] = await to (User.findOne({'stripe.customerId': customer_id}));
    let planid = req.stripeEvent.data.object.lines.data[0].plan.id;
    let amount = req.stripeEvent.data.object.lines.data[0].plan.amount;
    if (user){
      user.total_paid += amount;
      let updated;
      [error, updated] = await to (user.save());
      let filePath = path.join(__dirname, '../public/html/order_confirm.html');
      fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
        if (!err) {
          let htmldata = data.toString();
          var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
          htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
          htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');
          htmldata = htmldata.replace('http://example.com/price', amount + " USD");
          console.log(htmldata);
          mailer.sendEmail({
            from : '"QUEENSMTP.COM" <info@queensmtp.com>',
            to : [{ address: user.email, name:""}],
            subject: 'Order Confirmation',
            html : htmldata
          }, function(err, info){
            if (!err){
              console.log(err);
            }
          });
        }
      });
    }
    res.status(200).end();
  },
  'charge.failed': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    let user, error;
    console.log("Customer Event Data = " + JSON.stringify(req.stripeEvent));
    // let customer_id = req.stripeEvent.data.object.id;
    let customer_id = req.stripeEvent.custom;
    [error, user] = await to (User.findOne({'stripe.customerId': customer_id}));
    if (user){
      user.payment_status = 1;
      let updated;
      //TODO
      [error, updated] = await to (user.save());

      let filePath = path.join(__dirname, '../public/html/order_fail.html');
      fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
        if (!err) {
          let htmldata = data.toString();
          var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
          htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
          htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');
          htmldata = htmldata.replace('https://example.com/', Secrets.server_host_address);
          htmldata = htmldata.replace('Woodrow Nikolaus', 'Hello,' + user.profile_firstname);
          console.log(htmldata);
          mailer.sendEmail({
            from : '"QUEENSMTP.COM" <info@queensmtp.com>',
            to : [{ address: user.email, name:""}],
            subject: 'Order Failed',
            html : htmldata
          }, function(err, info){
            if (!err){
              console.log(err);
            }
          });
        }
      });

    }
    res.status(200).end();
  },
  'charge.refunded': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'charge.captured': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'charge.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'charge.dispute.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'charge.dispute.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'charge.dispute.closed': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');

    res.status(200).end();
  },
  'customer.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.card.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.card.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.card.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.subscription.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.subscription.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.subscription.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');

    if(req.stripeEvent.data && req.stripeEvent.data.object && req.stripeEvent.data.object.customer){
      // find user where stripeEvent.data.object.customer
      User.findOne({
        'stripe.customerId': req.stripeEvent.data.object.customer
      }, async function (err, user) {
        if (err) return next(err);
        if(!user){
          // user does not exist, no need to process
          return res.status(200).end();
        } else {
          user.stripe.last4 = '';
          user.stripe.plan = 'free';
          user.stripe.subscriptionId = '';
          user.save(function(err) {
            if (err) return next(err);
            console.log('user: ' + user.email + ' subscription was successfully cancelled.');
            return res.status(200).end();
          });
        }
      });
    } else {
      return next(new Error('stripeEvent.data.object.customer is undefined'));
    }
  },
  'customer.subscription.trial_will_end': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.discount.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.discount.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'customer.discount.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'invoice.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'invoice.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'invoice.payment_succeeded': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    let user, error, err, count;
    [error, user] = await to (User.findOne({'stripe.customerId': req.stripeEvent.data.object.id}));
    let planid = req.stripeEvent.data.object.lines.data[0].plan.id;
    let amount = req.stripeEvent.data.object.lines.data[0].plan.amount;
    if (user){
      user.total_paid += amount;
      let updated;
      [error, updated] = await to (user.save());
      let filePath = path.join(__dirname, '../public/html/order_confirm.html');
      fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
        if (!err) {
          let htmldata = data.toString();
          var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
          htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
          htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');
          htmldata = htmldata.replace('http://example.com/price', amount + " USD");
          console.log(htmldata);
          mailer.sendEmail({
            from : '"QUEENSMTP.COM" <info@queensmtp.com>',
            to : [{ address: user.email, name:""}],
            subject: 'Order Confirmation',
            html : htmldata
          }, function(err, info){
            if (!err){
              console.log(err);
            }
          });
        }
      });
    }
    res.status(200).end();
  },
  'invoice.payment_failed ': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');


    res.status(200).end();
  },
  'invoiceitem.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'invoiceitem.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'invoiceitem.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'plan.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'plan.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'plan.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'coupon.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'coupon.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'recipient.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'recipient.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'recipient.deleted': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'transfer.created': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'transfer.updated': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'transfer.paid': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'transfer.failed': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  },
  'ping': async function(req, res, next) {
    console.log(req.stripeEvent.type + ': event processed');
    res.status(200).end();
  }
};

module.exports = async function(req, res, next) {
  if(req.stripeEvent && req.stripeEvent.type && knownEvents[req.stripeEvent.type]){
    let log_stripe = new LogStripeActivity();
    log_stripe.customer_id = req.stripeEvent.data.object.id;
    let mstripe, error;
    [error, mstripe] = await to (MStripe.findOne({customer_id: log_stripe.customer_id}));
    if (mstripe){
      log_stripe.userid = mstripe.userid;
    }
    log_stripe.activity_type = req.stripeEvent.type;
    log_stripe.activity_sub_type = "";
    log_stripe.date = new Date();
    log_stripe.save(function(err){
    });
    knownEvents[req.stripeEvent.type](req, res, next);
  } else {
    return next(new Error('Stripe Event not found'));
  }
};
