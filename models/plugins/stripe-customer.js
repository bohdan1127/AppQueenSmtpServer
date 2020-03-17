'use strict';
let User = require('./../user');
let MStripe = require('./../stripe');
const { to , ReE , ReS} = require('./../../utils/util');
var Stripe = require('stripe');
var stripe;
var path = require('path');
let fs = require('fs');
let Secrets = require('../../config/secrets');
var mailer = require('./../../utils/mailer');

module.exports = exports = function stripeCustomer (schema, options) {
  stripe = Stripe(options.apiKey);
  schema.add({
    stripe: {
      customerId: String,
      subscriptionId: String,
      last4: String,
      plan: {
        type: String,
        default: options.defaultPlan
      }
    }
  });

  schema.pre('save', function (next) {
    var user = this;
    if(!user.isNew || user.stripe.customerId) return next();
    next();
    // user.createCustomer(function(err){
    //   if (err) return next(err);
    //   next();
    // });
  });

  schema.statics.getPlans = function () {
    return options.planData;
  };

  schema.methods.createCustomer = function(cb) {
    var user = this;

    stripe.customers.create({
      email: user.email
    }, function(err, customer){
      if (err) return cb(err);

      user.stripe.customerId = customer.id;
      return cb();
    });
  };

  schema.methods.setCard = async function(stripe_token, cb) {
    var user = this;

    var cardHandler = function(err, customer) {
      if (err) return cb(err);

      if(!user.stripe.customerId){
        user.stripe.customerId = customer.id;
      }

      var card = customer.cards ? customer.cards.data[0] : customer.sources.data[0];

      user.stripe.last4 = card.last4;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });

      MStripe.findOne({ user_id: user._id.toString()}, function(err, u_stripe) {
        if (u_stripe) {
          u_stripe.stripe_token = stripe_token;
          u_stripe.customer_id = user.stripe.customerId;
          u_stripe.save(function (err) {

          });
        } else {
          u_stripe = new MStripe({
            user_id: user._id.toString(),
            stripe_token: stripe_token,
            customer_id: user.stripe.customerId
          });
          u_stripe.save(function () {

          });
        }
      });


    };

    if(user.stripe.customerId){
      stripe.customers.update(user.stripe.customerId, {source: stripe_token}, cardHandler);
    } else {
      stripe.customers.create({
        email: user.email,
        source: stripe_token
      }, cardHandler);
    }
  };

  schema.methods.setPlan = function(plan, stripe_token, cb) {
    var user = this,
        customerData = {
          plan: plan
        };

    var subscriptionHandler = function(err, subscription) {
      if(err) return cb(err);

      user.stripe.plan = plan;
      user.stripe.subscriptionId = subscription.id;
      user.payment_status = 1;
      user.subscription = 1;
      let filePath = path.join(__dirname, '../../public/html/order_confirm.html');
      fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
        if (!err) {
          let htmldata = data.toString();
          var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
          htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
          htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');
          htmldata = htmldata.replace('http://example.com/price', Secrets.stripeOptions.planData[plan].price + " USD");
          htmldata = htmldata.replace('https://example.com/', Secrets.server_host_address);
          console.log(htmldata);
          mailer.sendEmail({
            from : '"QUEEN SMTP" <info@queensmtp.com>',
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
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

    var createSubscription = function(){
      stripe.subscriptions.create(
          {
            customer : user.stripe.customerId,
            items : [
              {
                plan : plan
              }
            ]
          },
          subscriptionHandler
      );
    };

    if(stripe_token) {
      user.setCard(stripe_token, function(err){
        if (err) return cb(err);
        createSubscription();
      });


    } else {
      if (user.stripe.subscriptionId){
        // update subscription
        stripe.subscriptions.update(
            user.stripe.subscriptionId,
            {
              //customer : user.stripe.customerId,
              items : [
                {
                  plan : plan
                }
              ]
            },
            subscriptionHandler
        );
      } else {
        createSubscription();
      }
    }
  };

  schema.methods.updateStripeEmail = function(cb){
    var user = this;

    if(!user.stripe.customerId) return cb();

    stripe.customers.update(user.stripe.customerId, {email: user.email}, function(err, customer) {
      cb(err);
    });
  };

  schema.methods.cancelStripe = function(cb){
    var user = this;

    if(user.stripe.customerId){
      stripe.customers.del(
          user.stripe.customerId
      ).then(function(confirmation) {
        cb();
      }, function(err) {
        return cb(err);
      });
    } else {
      cb();
    }
  };

  schema.methods.checkout_overage = async function(cb){
    let err, m_stripe;
    let user = this;
    let plan = options.planData[user.stripe.plan];
    [err , m_stripe] =  await to (MStripe.findOne({user_id : user._id.toString()}));
    if (user.stripe.plan !== "free") {
      if (m_stripe && m_stripe.stripe_token != ""){
        const body = {
          source:m_stripe.stripe_token,
          amount:plan.overage_price, //TODO //should be integer
          currency:plan.currency
        };
        let stripeErr, stripeRes;
        [stripeErr ,stripeRes] = await to (stripe.charges.create(body));

        if (stripeErr){
          cb(new Error('Failed to pay with stripe'));
        } else {
          if (stripeRes.status == "succeeded"){
            cb(null, {success: true, msg: 'Success to pay with stripe'})
          }
        }
      }
      else {
        cb(err, null);
      }
    }
  };
};
