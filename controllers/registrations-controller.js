'use strict';

var nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');
var passport = require('passport');
var User = require('../models/user');
var secrets = require('../config/secrets');
const {check, oneOf, validationResult}= require('express-validator');
var User = require('../models/user'),
plans = User.getPlans();
const { to , ReE , ReS, removeSpace} = require('./../utils/util');
// Show Registration Page
let AccessAddress = require('../models/access_address');

exports.getSignup = function(req, res){
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

  const id = req.params.id;
  res.render('signup', {form: form, error: error, plans:plans, planid:id});
};

exports.getVerificationNotice = function(req, res){
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

  res.render(req.render, {form: form, error: error});
};
exports.getActivateFail = function(req, res){
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

  res.render(req.render, {form: form, error: error});
};
exports.postSignup = function(req, res, next){
  console.log('next = ' + next );
  var errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    req.flash('form', {
      email: req.body.email
    });
    return res.redirect('/signup/free');
  }
  req.body.email = removeSpace(req.body.email);
  // calls next middleware to authenticate with passport
  passport.authenticate('signup', {
    successRedirect: '/signup_redirect',
    failureRedirect: '/signup/free',
    failureFlash : true
  })(req, res, next);
  // passport.authenticate('signup', function(error, user ,req){
  //   if (error != null || user == false){
  //     return res.redirect('/signup/free');
  //   }
  //   else {
  //     if (user.stripe.plan == "free"){
  //       return res.redirect('/dashboard');
  //     } else {
  //       return res.redirect('/users/billing');
  //     }
  //
  //   }
  // })(req, res, next);
};

exports.getActivate = function(req, res, next){
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

  req.body.email = 'a@a.com';
  req.body.password = 'password';
  passport.authenticate('activate', {
    successRedirect: '/signup_redirect',
    failureRedirect: '/activate_fail',
    failureFlash : true
  })(req, res, next);
};

exports.getActiviateAddress =async function(req, res, next){
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
  let id = req.params.id;
  let accessAddress;
  let ip_add =  req._remoteAddress;
  [error, accessAddress] = await to (AccessAddress.findById(id));

  if (accessAddress){
    accessAddress.status = 1
  }
  let updatedAccess;
  [error, updatedAccess] = await to (accessAddress.save());

  let user;
  [error, user] = await to (User.findById(updatedAccess.userid));

  if (user)
  {
    req.login(user, function(err){
      if (err)
      {
        req.flash('error', 'Failed to verify your ip Address.');
        return res.redirect(req.redirect.failure);
      }
      else
      {
        return res.redirect("/");
      }
    });

  }
  req.flash('error', 'Failed to verify your ip Address.');
  return res.render(req.redirect.failure);

};