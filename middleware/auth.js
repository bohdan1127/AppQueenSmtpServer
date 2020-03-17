'use strict';

exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()){
    return next();
    // var user = req.user;
    // if (user != undefined && user.stripe.plan == "free"){
    //   return next();
    // } else if (user.stripe.plan != "free"){
    //   if (user.stripe.subscriptionId != undefined && user.stripe.subscriptionId != ""){
    //     return next();
    //   }
    //   return res.redirect('/users/billing');
    // }
  }
  res.redirect(req.redirect.auth);
};

exports.isUnauthenticated = function(req, res, next) {
  var user = req.user;
  //if (!req.isAuthenticated() || user == undefined || !user.activate){ //TODO
  if (!req.isAuthenticated()){
    return next();
  }

  res.redirect(req.redirect.auth);
};

exports.isAdmin = function(req, res, next) {
  var user = req.user;

  if (user.role == 1){
    return next();
  }
  res.render('error');
};