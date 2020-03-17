'use strict';

// This controller handles setting/clearing sessions when
// logging in and out.
const {check, oneOf, validationResult}= require('express-validator');
var passport = require('passport');
const { to , ReE , ReS, removeSpace} = require('./../utils/util');

exports.postLogin = function(req, res, next){
  var errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }
  // this middleware can be found in /server/middleware/passport.js
  // re: passport.use('login', ...);
  req.body.email = removeSpace(req.body.email);
  passport.authenticate('login', {
    successRedirect: req.redirect.success,
    failureRedirect: req.redirect.failure,
    failureFlash : true
  })(req, res, next);
};

exports.logout = function(req, res){
  var time = 60 * 1000;
  req.logout();
  req.session.cookie.maxAge = time;
  req.session.cookie.expires = new Date(Date.now() + time);
  req.session.touch();
  //req.flash('success','Successfully logged out.');
  //res.redirect(req.redirect.success);
  res.redirect("https://queensmtp.com");

};