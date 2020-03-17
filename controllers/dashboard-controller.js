'use strict';
let request = require('request');
let User = require('../models/user'),
    plans = User.getPlans();
let Email = require('../models/email');
const { to , ReE , ReS} = require('./../utils/util');
let Secrets = require('../config/secrets');
let Bounces = require('../controllers/bounce-controller');
let BounceEmailCount = require('../models/bounce_email_count');

exports.signup_redirect = async function(req, res, next) {
  if (req.user != undefined){
    if (req.user.stripe.plan == "free"){
      return res.redirect('/dashboard');
    } else {
      return  res.redirect('/users/billing');
    }
  } else {
    return res.redirect(req.redirect.failure);
  }

};
exports.getDefault = async function(req, res, next){

//For test
  let bounce_ret,b_error;
  [b_error, bounce_ret] = await to (Bounces.existUserDomain("kkk2",  "ms12.rnsm.net"));


  var form = {},
      error1 = null,
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');

  if (formFlash.length) {
    form.email = formFlash[0].email;
  }
  if (errorFlash.length) {
    error1 = errorFlash[0];
  }
  if (req.user.role == 1){
    return res.redirect('/admin/dashboard');
  }
  let user = req.user;
  let error, rate;
  let totalCount = 0, open_count = 0, click_count = 0, m_bounce_count = 0,d_bounce_count = 0, d_unsubscribe_count = 0, m_unsubscribe_count = 0, report_count = 0;
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

  [error, totalCount] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  d_totalCount = totalCount;

  [error, open_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), open_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, click_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), click_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, d_bounce_count] = await to (Email.countDocuments({userid: user._id.toString(), bounce_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  let email_bounce_count;
  [error, email_bounce_count] = await to (BounceEmailCount.countDocuments({userid: user._id.toString(), updatedDate: { $gte : beforeDate, $lte: afterDate}}));
  d_bounce_count += email_bounce_count;
  // [error, unsubscribe_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), unsubscribe_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, d_unsubscribe_count] = await to (Email.countDocuments({userid: user._id.toString(), unsubscribe_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, report_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), report_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  if (totalCount > 0){
    open_rate = Math.round(open_count * 100 / totalCount);
    click_rate = Math.round(click_count * 100 / totalCount);
    bounce_rate = Math.round(d_bounce_count * 100 / totalCount);
    unsubscribe_rate = Math.round(d_unsubscribe_count * 100 / totalCount);
    report_rate = Math.round(report_count * 100 / totalCount);

  }
  [error, totalCount] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));


  [error, open_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), open_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, click_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), click_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, m_bounce_count] = await to (Email.countDocuments({ userid: user._id.toString(), bounce_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  let m_email_bounce_count;
  [error, m_email_bounce_count] = await to (BounceEmailCount.countDocuments({userid: user._id.toString(), updatedDate: { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  m_bounce_count += m_email_bounce_count;
  //[error, unsubscribe_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), unsubscribe_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, m_unsubscribe_count] = await to (Email.countDocuments({ userid: user._id.toString(), unsubscribe_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, report_count] = await to (Email.countDocuments({sent: 1, userid: user._id.toString(), report_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  if (totalCount > 0){
    m_open_rate = Math.round(open_count * 100 / totalCount);
    m_click_rate = Math.round(click_count * 100 / totalCount);
    m_bounce_rate = Math.round(m_bounce_count * 100 / totalCount);
    m_unsubscribe_rate = Math.round(m_unsubscribe_count * 100 / totalCount);
    m_report_rate = Math.round(report_count * 100 / totalCount);
  }

  //TODO for dashboard
  let sent_counts =[], open_counts = [];
  [error, sent_counts] = await to (Email.aggregate([
    {
      $match: {
        my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate},
        sent : 1
      }
    },
    {
      $group: {
        // _id :{ $substr : ["$my_sent_success_date", 0, 10]},
        _id :{ $dateToString : {date:"$my_sent_success_date", format:'%Y-%m-%d'}},
        count: {$sum: 1}
      }
    }
  ]));
  [error, open_counts] = await to (Email.aggregate([
    {
      $match: {
        my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate},
        open_status: 1,
        sent : 1
      }
    },
    {
      $group: {
        // _id :{ $substr : ["$my_sent_success_date", 0, 10]},
        _id :{ $dateToString : {date:"$my_sent_success_date", format:'%Y-%m-%d'}},
        count: {$sum: 1}
      }
    }
  ]));
  let m_sent_counts = [];
  for (let i = 0 ; i < sent_counts.length; i++){
    m_sent_counts.push([sent_counts[i]._id, sent_counts[i].count]);
    m_sent_counts.push(['2020-01-03', sent_counts[i].count + 100]);
  }
  return res.render(req.render, { user: req.user, form: form, error: error1, plans: plans, d_open: open_rate, d_click: click_rate, d_bounce: d_bounce_count,
    d_unsubscribe: d_unsubscribe_count,m_open: m_open_rate, m_click: m_click_rate, m_bounce: m_bounce_count,
    m_unsubscribe: m_unsubscribe_count, m_totalCount:totalCount , d_totalCount: d_totalCount, sent_counts : m_sent_counts
  });
};
function toTimestamp(strDate){
  var datum = Date.parse(strDate);
  return datum;
}
exports.postGetCounts = async function(req, res, next){
  let error;
  let nowDate = new Date();
  let sent_counts =[], open_counts = [];
  let beforeMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth());
  let afterMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1);
  [error, sent_counts] = await to (Email.aggregate([
    {
      $match: {
        my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate},
        sent : 1,
        userid: req.user._id.toString()
      }
    },
    {
      $group: {
        _id :{ $dateToString : {date:"$my_sent_success_date", format:'%Y-%m-%d'}},
        count: {$sum: 1},
        count_open: {$sum: "$open_status"}
      }
    }
    ,
    {$sort: {_id : 1}}
  ]));
  let m_sent_counts = [], m_open_counts = [];
  for (let i = 0 ; i < sent_counts.length; i++){
    m_sent_counts.push([toTimestamp(sent_counts[i]._id), sent_counts[i].count]);
    m_open_counts.push([toTimestamp(sent_counts[i]._id), sent_counts[i].count_open]);
  }
  return res.json({ sent_counts : m_sent_counts, open_counts: m_open_counts});

};

exports.postAdminGetCounts = async function(req, res, next){
  let error;
  let nowDate = new Date();
  let sent_counts =[], open_counts = [];
  let beforeMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth());
  let afterMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1);
  [error, sent_counts] = await to (Email.aggregate([
    {
      $match: {
        my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate},
        sent : 1
      }
    },
    {
      $group: {
        _id :{ $dateToString : {date:"$my_sent_success_date", format:'%Y-%m-%d'}},
        count: {$sum: 1},
        count_open: {$sum: "$open_status"}
      }
    }
    ,
    {$sort: {_id : 1}}
  ]));
  let m_sent_counts = [], m_open_counts = [];
  for (let i = 0 ; i < sent_counts.length; i++){
    m_sent_counts.push([toTimestamp(sent_counts[i]._id), sent_counts[i].count]);
    m_open_counts.push([toTimestamp(sent_counts[i]._id), sent_counts[i].count_open]);
  }
  return res.json({ sent_counts : m_sent_counts, open_counts: m_open_counts});

};
exports.getBilling = function(req, res, next){
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
  res.render(req.render, {user: req.user, form: form, error: error, plans: plans});
};

exports.getSingUpBilling = function(req, res, next){
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
  res.render(req.render, {user: req.user, form: form, error: error, plans: plans});
};

exports.getAdminDefault = async function(req, res, next){
  var form = {},
      error1 = null,
      formFlash = req.flash('form'),
      errorFlash = req.flash('error');

  if (formFlash.length) {
    form.email = formFlash[0].email;
  }
  if (errorFlash.length) {
    error1 = errorFlash[0];
  }
  let user = req.user;
  let error, rate;
  let totalCount, open_count, click_count, bounce_count, unsubscribe_count, report_count;
  let nowDate = new Date();
  let beforeDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  let afterDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1);
  let beforeMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth());
  let afterMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1);

  let m_bounce_count = 0;
  let d_bounce_count = 0;
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
  [error, totalCount] = await to (Email.countDocuments({sent: 1,  my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  d_totalCount = totalCount;

  [error, open_count] = await to (Email.countDocuments({sent: 1, open_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, click_count] = await to (Email.countDocuments({ sent: 1, click_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, d_bounce_count] = await to (Email.countDocuments({  bounce_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  let email_bounce_count;
  [error, email_bounce_count] = await to (BounceEmailCount.countDocuments({updatedDate: { $gte : beforeDate, $lte: afterDate}}));
  d_bounce_count += email_bounce_count;
  [error, unsubscribe_count] = await to (Email.countDocuments({sent: 1, unsubscribe_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  [error, report_count] = await to (Email.countDocuments({sent: 1, report_status: 1, my_sent_success_date : { $gte : beforeDate, $lte: afterDate}}));
  if (totalCount > 0){
    open_rate = Math.round(open_count * 100 / totalCount);
    click_rate = Math.round(click_count * 100 / totalCount);
    bounce_rate = Math.round(d_bounce_count * 100 / totalCount);
    unsubscribe_rate = Math.round(unsubscribe_count * 100 / totalCount);
    report_rate = Math.round(report_count * 100 / totalCount);

  }
  [error, totalCount] = await to (Email.countDocuments({ sent: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));


  [error, open_count] = await to (Email.countDocuments({ sent: 1, open_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, click_count] = await to (Email.countDocuments({ sent: 1, click_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, m_bounce_count] = await to (Email.countDocuments({  bounce_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  let m_email_bounce_count;
  [error, m_email_bounce_count] = await to (BounceEmailCount.countDocuments({updatedDate: { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  m_bounce_count += m_email_bounce_count;

  [error, unsubscribe_count] = await to (Email.countDocuments({ sent: 1, unsubscribe_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  [error, report_count] = await to (Email.countDocuments({ sent: 1, report_status: 1, my_sent_success_date : { $gte : beforeMonthDate, $lte: afterMonthDate}}));
  if (totalCount > 0){
    m_open_rate = Math.round(open_count * 100 / totalCount);
    m_click_rate = Math.round(click_count * 100 / totalCount);
    m_bounce_rate = Math.round(m_bounce_count * 100 / totalCount);
    m_unsubscribe_rate = Math.round(unsubscribe_count * 100 / totalCount);
    m_report_rate = Math.round(report_count * 100 / totalCount);

  }
  res.render(req.render, {user: req.user, form: form, error: error1, plans: plans, d_open: open_rate, d_click: click_rate, d_bounce: d_bounce_count,
    d_unsubscribe: unsubscribe_rate,m_open: m_open_rate, m_click: m_click_rate, m_bounce: m_bounce_count,
    m_unsubscribe: m_unsubscribe_rate, m_totalCount:totalCount , d_totalCount: d_totalCount
  });

};

