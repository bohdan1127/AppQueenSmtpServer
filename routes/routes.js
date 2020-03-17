'use strict';

// middleware
var StripeWebhook = require('stripe-webhook-middleware'),
isAuthenticated = require('./../middleware/auth').isAuthenticated,
isUnauthenticated = require('./../middleware/auth').isUnauthenticated,
isAdmin = require('./../middleware/auth').isAdmin,
setRender = require('middleware-responder').setRender,
setRedirect = require('middleware-responder').setRedirect,
stripeEvents = require('./../middleware/stripe-events'),
secrets = require('./../config/secrets');
// controllers
var users = require('./../controllers/users-controller'),
main = require('./../controllers/main-controller'),
dashboard = require('./../controllers/dashboard-controller'),
passwords = require('./../controllers/passwords-controller'),
registrations = require('./../controllers/registrations-controller'),
sessions = require('./../controllers/sessions-controller'),
domains = require('./../controllers/domain-controller'),
emails = require('./../controllers/email-controller'),
records = require('./../controllers/record-controller');
let AccessAddress = require('../models/access_address');
var {check, oneOf,  validationResult} = require('express-validator');
var stripeWebhook = new StripeWebhook({
  stripeApiKey: secrets.stripeOptions.apiKey,
  respond: true
});
var express = require('express');
var router = express.Router();
module.exports = function (app, passport) {
    app.all('/*', users.intercept);
  // homepage and dashboard
  app.get('/',
    setRedirect({auth: '/dashboard'}),
    isUnauthenticated,
    setRender('index'),
    main.getHome);

  app.get('/signin',
      setRedirect({auth: '/dashboard'}),
      isUnauthenticated,
      setRender('signin'),
      main.getHome
  );
  // sessions
  app.post('/login',
    [
        check('email', 'Please sign in with a valid email.').isEmail(),
        check('password', 'Password must be at least 6 characters long').isLength(6),
    ],
    setRedirect({auth: '/dashboard', success: '/dashboard', failure: '/signin'}),
    isUnauthenticated,
    sessions.postLogin);
  app.get('/logout',
    setRedirect({auth: '/', success: '/'}),
    isAuthenticated,
    sessions.logout);

  // registrations
  app.get('/signup/:id',
    setRedirect({auth: '/verification'}),
    isUnauthenticated,
    setRender('signup'),
    registrations.getSignup);
  app.post('/signup',
    [
        check('email', 'Please sign up with a valid email.').isEmail(),
        check('password', 'Password must be at least 6 characters long').isLength(6),
        check('firstname', 'Please input First Name.').not().isEmpty(),
        check('lastname', 'Please input Last Name.').not().isEmpty(),
        check('address1', 'Please input Address.').not().isEmpty(),
        check('city', 'Please input City.').not().isEmpty(),
        check('state', 'Please input State').not().isEmpty(),
        check('postal', 'Please input Postal').not().isEmpty(),
        check('country', 'Please select Country.').not().isEmpty()
    ],
    setRedirect({auth: '/billing', success: '/billing', failure: '/signup'}),
    isUnauthenticated,
    registrations.postSignup);
  app.get('/users/billing',
    setRender('subscription'),
    setRedirect({auth: '/'}),
    //isUnauthenticated,
      isAuthenticated,
    dashboard.getSingUpBilling);

  app.get('/verification',
      setRender('verification'),
      setRedirect({auth: '/'}),
      isUnauthenticated,
      registrations.getVerificationNotice
  );
    app.get('/activate_fail',
        setRender('activate_fail'),
        setRedirect({auth: '/'}),
        isUnauthenticated,
        registrations.getActivateFail
    );

  // forgot password
  app.get('/forgot',
    setRedirect({auth: '/signin',success:'/forgot', failure:'/forgot'}),
    isUnauthenticated,
    setRender('forgot'),
    passwords.getForgotPassword);
  app.post('/forgot',
    [
      check('email', 'Please enter a valid email address.').isEmail(),
    ],
    setRedirect({auth: '/signin', success: '/forgot', failure: '/forgot'}),
    isUnauthenticated,
    passwords.postForgotPassword);

  // reset tokens
  app.get('/reset/:token',
    setRedirect({auth: '/dashboard', failure: '/forgot'}),
    isUnauthenticated,
    setRender('reset'),
    passwords.getToken);

  app.post('/reset/:token',
    [
      check('password', 'Password must be at least 6 characters long.').isLength(6),
      check('confirm', 'Passwords must match.')
          .isLength({min:6})
          .custom((value, {req, loc, path}) => {
              if (value !== req.body.password){
                throw new Error('Passwords must match');
              }
              else
              {
                return value;
              }
          })
    ],
    setRedirect({auth: '/dashboard', success: '/dashboard', failure: 'back'}),
    isUnauthenticated,
    passwords.postToken);

  app.get('/dashboard',
    setRender('dashboard/index'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    dashboard.getDefault);

  app.post('/dashboard',
    setRedirect({auth: '/dashboard'}),
    isAuthenticated,
    dashboard.postGetCounts);
  app.post('/admin/dashboard',
    setRedirect({auth: '/dashboard'}),
    isAuthenticated,
    dashboard.postAdminGetCounts);
   app.get('/admin/dashboard',
    isAuthenticated,
    setRedirect({auth: '/signin', success:'/admin/dashboard', failure:'/admin/dashboard'}),
    isAdmin,
    setRender('admin/index'),
    dashboard.getAdminDefault);
  app.get('/signup_redirect',
    setRedirect({auth: '/', failure:'/signup/free'}),
    isAuthenticated,
    dashboard.signup_redirect);
  app.get('/billing',
    setRender('dashboard/billing'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    dashboard.getBilling);

  app.get('/profile',
    setRender('dashboard/profile'),
    setRedirect({auth: '/'}),
    isAuthenticated,
    users.getProfile);

  // user api stuff
  app.post('/user',
    [
        check('email', 'Email is not valid.').isEmail(),
        check('firstname', 'Please input First Name.').not().isEmpty(),
        check('lastname', 'Please input Last Name.').not().isEmpty(),
        check('address1', 'Please input Address.').not().isEmpty(),
        check('city', 'Please input City.').not().isEmpty(),
        check('state', 'Please input State').not().isEmpty(),
        check('postal', 'Please input Postal').not().isEmpty(),
        check('country', 'Please select Country.').not().isEmpty(),

    ],
    setRedirect({auth: '/signin', success: '/profile', failure: '/profile'}),
    isAuthenticated,
    users.postProfile);

  app.get('/user/activate/:id',
    setRedirect({auth: '/signin', success: '/', failure: '/activate_fail'}),
    isAuthenticated,
    registrations.getActivate
  );
    app.get('/user/address/verify/:id',
        setRedirect({auth: '/signin', success: '/', failure: '/signin'}),
        registrations.getActiviateAddress
    );
  app.post('/user/billing',
    setRedirect({auth: '/', success: '/billing', failure: '/billing'}),
    isAuthenticated,
    users.postBilling);
  app.post('/user/signup/billing',
        setRedirect({auth: '/', success: '/dashboard', failure: '/users/billing'}),
        isAuthenticated,
        users.postPlan);
  app.post('/user/plan',
    setRedirect({auth: '/', success: '/billing', failure: '/billing'}),
    isAuthenticated,
    users.postPlan);

  app.post('/users/billing/plan/free',
    setRedirect({auth: '/', success: '/dashboard', failure: '/users/billing'}),
    isAuthenticated,
    users.setUserPlanFree);
  app.post('/user/password',
    [
      check('o_password', 'Current Password must be set.').not().isEmpty(),
      check('password', 'Password must be at least 6 characters long.').isLength(6),
      check('confirm', 'Passwords must match.')
          .isLength({min:6})
          .custom((value, {req, loc, path}) => {
            if (value !== req.body.password){
              throw new Error('Passwords must match');
            }
            else
            {
              return value;
            }
          })
    ],
    setRedirect({auth: '/', success: '/profile', failure: '/profile'}),
    isAuthenticated,
    passwords.postNewPassword);
  app.post('/user/delete',
    setRedirect({auth: '/', success: '/'}),
    isAuthenticated,
    users.deleteAccount);

  // use this url to receive stripe webhook events
  app.post('/stripe/events',
    stripeWebhook.middleware,
    stripeEvents
  );

  //domain
    app.get('/domain/sending',
        setRedirect({auth:'/signin', success:'/domain/sending'}),
        isAuthenticated,
        setRender('domain/sending_domain'),
        domains.getDomains
    );

    app.post('/domain/add',
        [
            check('domain', 'Domain is not Empty.').not().isEmpty(),
        ],
        setRedirect({auth:'/signin', success:'/domain/detail', failure:'/domain/sending'}),
        isAuthenticated,
        domains.addDomain
    );

    app.post('/domain/delete',
        [
            check('domain_id', 'Please select domain to delete.').not().isEmpty(),
        ],
        setRedirect({auth:'/signin', success:'/domain/sending', failure:'/domain/sending'}),
        isAuthenticated,
        domains.deleteDomain
    );

    app.post('/domain/list',
        setRedirect({auth: '/signin', success:'/domain/sending', failure:'/domain/sending'}),
        isAuthenticated,
        domains.postGetDomain
        );
    app.get('/domain/detail/:id',
        setRedirect({auth: '/signin', success:'/domain/sending'}),
        isAuthenticated,
        setRender('domain/domain_detail'),
        domains.getDomainDetail
    );

    app.post('/domain/verify/spf',
        setRedirect({auth: '/signin', success:'/domain/sending' ,failure: '/domain/detail'}),
        isAuthenticated,
        setRender('domain/domain_detail'),
        domains.postVerifySPFDomain
    );
    app.post('/domain/verify/dkim',
        setRedirect({auth: '/signin', success:'/domain/sending' ,failure: '/domain/detail'}),
        isAuthenticated,
        setRender('domain/domain_detail'),
        domains.postVerifyDKIMDomain
    );
    app.get('/domain/verify/email/:id',
        setRedirect({auth: '/signin', success:'/domain/sending' ,failure: '/domain/sending'}),
        isAuthenticated,
        setRender('domain/sending'),
        domains.getVerifyEmail
    );
    app.post('/domain/verify/email/resend',
        setRedirect({auth: '/signin', success:'/domain/sending' ,failure: '/domain/sending'}),
        isAuthenticated,
        setRender('domain/sending'),
        domains.domainResendEmail
    );

    //record
    app.get('/record',
        setRedirect({auth:'/signin', success:'/', failure: '/'}),
        isAuthenticated,
        isAdmin,
        setRender('record/records'),
        records.getRecords,
    );
    app.post('/record/list',
        setRedirect({auth:'/signin', success:'/', failure: '/'}),
        isAuthenticated,
        isAdmin,
        setRender('record/records'),
        records.postGetRecords,
    );
    app.post('/record/add',
        [
            check('domain', 'Please input correct record name.').not().isEmpty()
        ],
        setRedirect({auth: '/signin', success:'/record', failure:'/record'}),
        isAuthenticated,
        isAdmin,
        setRender('record/records'),
        records.addRecord,
    );
    app.post('/record/delete',
        [
            check('record_id', 'Please select record to delete.').not().isEmpty()
        ],
        setRedirect({auth: '/signin', success:'/record', failure:'/record'}),
        isAuthenticated,
        isAdmin,
        setRender('record/records'),
        records.deleteRecord,
    );

    app.get('/user/smtp',
        setRedirect({auth:'/signin', success:'/user/smtp' , failure:'/user/smtp'}),
        isAuthenticated,
        setRender('smtp/smtp'),
        users.getSMTP
    );

    app.post('/user/generate_pwd',
        setRedirect({auth:'/signin', success:'/user/smtp', failure:'/user/smtp'}),
        isAuthenticated,
        users.postGenPwd
    );

    app.post('/user/send_email_verify',
        setRedirect({auth: '/signin', success:'/profile', failure:'/profile'}),
        isAuthenticated,
        users.postSendEmailToVerify
    );




    app.get('/admin/users',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/users'),
        users.getAdminUsers
    );

    app.post('/admin/users',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/users'),
        users.postAdminUsers
    );
    app.post('/admin/user/suspend',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/users'),
        users.postAdminUserSuspend
    );
    app.post('/admin/user/update',
        [
            check('daily_count', 'Please input host address.').isNumeric().custom((value, {req, loc, path}) => {
                if (value < 0 ) {
                    throw new Error('Please input more than 0.');
                }
                else
                {
                    return value;
                }
            }),
            check('hourly_count', 'Please input port.').isNumeric().custom((value, {req, loc, path}) => {
                if (value < 0 ) {
                    throw new Error('Please input more than 0.');
                }
                else
                {
                    return value;
                }
            }),
        ],
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/users'),
        users.postAdminUserUpdate);
    app.post('/admin/user/delete',
        setRedirect({auth: '/', success: '/admin/users', failure: '/admin/users'}),
        isAuthenticated,
        users.postAdminDeleteAccount);
    app.get('/admin/setting',
        setRedirect({auth:'/signin', success:'/admin/setting', failure:'/admin/setting'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/setting'),
        users.getAdminSetting);
    app.post('/admin/setting',
        [
            check('open_limit_rate', 'Please input correct open limit rate.').
            isNumeric().custom((value, {req, loc, path}) => {
                if (value < 0 || value > 100){
                    throw new Error('Please input number between 0 ~ 10.');
                }
                else
                {
                    return value;
                }
            }),
            check('click_limit_rate', 'Please input correct click limit rate.').
            isNumeric().custom((value, {req, loc, path}) => {
                if (value < 0 || value > 100){
                    throw new Error('Please input number between 0 ~ 10.');
                }
                else
                {
                    return value;
                }
            }),
            check('bounce_limit_rate', 'Please input bounce rate with number.').isNumeric()
                .custom((value, {req, loc, path}) => {
                    if (value < 0 || value > 100){
                        throw new Error('Please input number between 0 ~ 10.');
                    }
                    else
                    {
                        return value;
                    }
                }),
            check('new_send_count', 'Please input count which new user can send.').isNumeric()
                .custom((value, {req, loc, path}) => {
                    if (value < 0){
                        throw new Error('Please input number above 0.');
                    }
                    else
                    {
                        return value;
                    }
                })
        ],
        setRedirect({auth:'/signin', success:'/admin/setting', failure:'/admin/setting'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/setting'),
        users.postSaveSetting);
    app.get('/admin/user_edit/:id',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/user_detail'),
        users.getAdminUserEdit
    );
    app.get('/admin/user/detail/:id',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/user_detail'),
        users.getAdminUserDetail
    );
    app.post('/admin/user/emails',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        users.postAdminGetUserEmails
    );

    app.post('/admin/email/body',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        users.postGetEmailBody
    );

    app.post('/admin/user/active',
        setRedirect({auth:'/signin', success:'/admin/users', failure:'/admin/users'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/users'),
        users.postAdminUserActive
    );
    app.get('/admin/emails',
        setRedirect({auth:'/signin', success:'/admin/emails', failure:'/admin/emails'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/emails'),
        emails.getEmails
    );
    app.post('/admin/emails',
        setRedirect({auth:'/signin', success:'/admin/emails', failure:'/admin/emails'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/emails'),
        emails.postGetEmails
    );

    app.get('/admin/send/domain',
        setRedirect({auth:'/signin', success:'/admin/send/domain', failure:'/admin/send/domain'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/checkdomain'),
        users.getSendDomain
    );
    app.post('/admin/send/domain',
        setRedirect({auth:'/signin', success:'/admin/send/domain', failure:'/admin/send/domain'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/checkdomain'),
        users.postAdminSendDomains
    );
    app.post('/admin/send/domain/add',
        [
            check('domain', 'Please input host address.').not().isEmpty(),
        ],
        setRedirect({auth:'/signin', success:'/admin/send/domain', failure:'/admin/send/domain'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/checkdomain'),
        users.postAddSendDomain
    );
    app.get('/admin/smtp',
        setRedirect({auth:'/signin', success:'/admin/smtp', failure:'/admin/smtp'}),
        isAuthenticated,
        isAdmin,
        setRender('smtp/admin_smtp'),
        users.getAdminSmtps
    );

    app.post('/admin/smtp/domain/verify/dkim',
        setRedirect({auth:'/signin', success:'/admin/smtp', failure:'/admin/smtp'}),
        isAuthenticated,
        isAdmin,
        users.postSmtpDomainVerified
    );

    app.post('/admin/smtp/getbyid',
        isAuthenticated,
        isAdmin,
        users.postGetSmtpById
    );

    app.post('/admin/smtp',
        setRedirect({auth:'/signin', success:'/admin/smtp', failure:'/admin/smtp'}),
        isAuthenticated,
        isAdmin,
        setRender('smtp/admin_smtp'),
        users.postAdminSmtps
    );
    app.get('/admin/smtp_edit/:id',
        setRedirect({auth:'/signin', success:'/admin/smtp', failure:'/admin/smtp'}),
        isAuthenticated,
        isAdmin,
        setRender('smtp/admin_smtp'),
        users.getAdminSmtpsEdit
    );


    app.post('/admin/send/domain/delete',
        [
            check('domain_id', 'Please select correct domain.').not().isEmpty(),
        ],
        setRedirect({auth:'/signin', success:'/admin/send/domain', failure:'/admin/send/domain'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/checkdomain'),
        users.postSendDomainDelete
    );
    app.post('/admin/smtp/add',
        [
            check('name', 'Please input smtp server name.').not().isEmpty(),
            check('host', 'Please input host address.').not().isEmpty(),
            check('port', 'Please input port.').not().isEmpty(),
            check('username', 'Please input username.').not().isEmpty(),
            check('userpass', 'Please input userpass.').not().isEmpty(),
            check('monthly_count', 'Please input monthly count.').isNumeric()
                .custom((value, {req, loc, path}) => {
                    if (value < 0){
                        throw new Error('Please input above 0');
                    }
                    else
                    {
                        return value;
                    }
                }),
            check('daily_count', 'Please input daily count.').isNumeric()
                .custom((value, {req, loc, path}) => {
                    if (value < 0){
                        throw new Error('Please input above 0.');
                    }
                    else
                    {
                        return value;
                    }
                })
        ],
        setRedirect({auth:'/signin', success:'/admin/smtp', failure:'/admin/smtp'}),
        isAuthenticated,
        isAdmin,
        setRender('smtp/admin_smtp'),
        users.postAdminSmtpAddOrEdit
    );

    app.post('/admin/smtp/del',
        setRedirect({auth:'/signin', success:'/admin/smtp', failure:'/admin/smtp'}),
        isAuthenticated,
        isAdmin,
        setRender('smtp/admin_smtp'),
        users.postAdminSmtpDel
    );

    app.get('/admin/email/review',
        setRedirect({auth:'/signin', success:'/admin/email/review', failure:'/admin/email/review'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/emails_review'),
        emails.getEmails
    );
    app.post('/admin/email/review/active',
        setRedirect({auth:'/signin', success:'/admin/email/review', failure:'/admin/email/review'}),
        isAuthenticated,
        isAdmin,
        emails.postSetEmailActive
    );

    app.post('/admin/email/review',
        setRedirect({auth:'/signin', success:'/admin/email/review', failure:'/admin/email/review'}),
        isAuthenticated,
        isAdmin,
        setRender('admin/emails_review'),
        emails.postGetReviewEmails
    );
    app.get('/email_track/:id',
        setRedirect({auth: '/signin', success: '/', failure: '/'}),
        setRender('public/unsubscribe.html'),
        emails.getTrackEmail
    );

    app.get('/emails/unsubscribe/:id',
        setRedirect({auth:'/signin', success: '/', failure : '/'}),
        setRender('public/unsubscribe.html'),
        emails.getUnsubscribe
    );
    app.get('/user/unsubscribe/:id',
        setRedirect({auth:'/signin', success: '/', failure : '/'}),
        setRender('public/unsubscribe.html'),
        users.getUnsubscribe
    );

    app.post('/emails/unsubscribe',
        setRedirect({auth:'/signin', success: '/emails/unsubscribe', failure : '/emails/unsubscribe'}),
        emails.postUnsubscribe
    );
    app.post('/emails/report',
        setRedirect({auth:'/signin', success: '/emails/unsubscribe', failure : '/emails/unsubscribe'}),
        emails.postReport
    );
    app.get('/emails/redirect/:id',
        setRedirect({auth:'/signin', success: '/', failure : '/'}),
        setRender(''),
        emails.getRedirectClick
    );


};