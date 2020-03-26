var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var Activation = require('../models/activation');
let Secrets = require('../config/secrets');
var crypto = require('crypto');
var mailer = require('./../utils/mailer');
let fs = require('fs');
var path = require('path');
const { to , ReE , ReS} = require('./../utils/util');
let plans = User.getPlans();
let Count = require('../models/count');
let AccessAddress = require('../models/access_address');
let request1 = require('./../controllers/request');

module.exports = function(passport){

    passport.serializeUser(function(user, done) {
        //done(null, user.id);
        done(null, user);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id._id, function(err, user) {
            //User.findById(id._id, function(err, user) {
            done(err, user);
        });
    });

    // login
    passport.use('login', new LocalStrategy({
            usernameField: 'email',
            passReqToCallback : true
        },
        function(req, email, password, done) {
            User.findOne({ 'email' :  email },
                function(err, user) {
                    if (err) return done(err);
                    if (!user){
                        return done(null, false, req.flash('error', 'User not found'));
                    }
                    user.comparePassword(password, function(err, isMatch) {
                        if (isMatch) {
                            //if (user.activate){
                            var time = 14 * 24 * 3600000;
                            req.session.cookie.maxAge = time; //2 weeks
                            req.session.cookie.expires = new Date(Date.now() + time);
                            req.session.touch();
                            var getClientAddress = (req.headers['x-forwarded-for'] || '').split(',')[0]
                                || req.connection.remoteAddress;
                            console.log('ipaddress= ' + getClientAddress);
                            console.log('real ip = ' + req.ip);
                            let ip_add =  getClientAddress;

                            let error, address;
                            if (ip_add != user.ip_address)
                            {
                                AccessAddress.findOne({userid: user._id.toString(),ip_address: ip_add }, function (err, logAccessAddress) {
                                    if (logAccessAddress){
                                        if (logAccessAddress.status == 1)
                                        {
                                            return done(null, user, req.flash('success', 'Successfully logged in.'));
                                        }
                                        else
                                        {
                                            return done(null, false, req.flash('error', 'Your location is not verified.'))
                                        }
                                    }
                                    let logAccess = new AccessAddress({userid: user._id, ip_address: ip_add, mDate:new Date()});
                                    logAccess.save(function(err, saved){
                                        let filePath = path.join(__dirname, '../public/html/location_verification.html');
                                        fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data){
                                            let htmldata = data.toString();
                                            var link= Secrets.server_host_address + "/user/address/verify/" + saved._id.toString();
                                            htmldata = htmldata.replace('robertallen@company.com', user.email);
                                            htmldata = htmldata.replace('https://example.com/activation', link);
                                            var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
                                            htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
                                            htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');

                                            console.log(htmldata);
                                            mailer.sendEmail({
                                                from : '"QUEENSMTP.COM" <info@queensmtp.com>',
                                                to : [{ address: req.body.email, name:""}],
                                                subject: 'Suspicious activity verify email address to login your account.',
                                                html : htmldata
                                            }, function(err, info){
                                                if (!err){
                                                    console.log(err);
                                                }
                                                return done(null, false, req.flash('error', 'Suspicious activity verify email address to login your account.'));

                                            });
                                        });
                                    });
                                });
                            }
                            else
                            {
                                return done(null, user, req.flash('success', 'Successfully logged in.'));
                            }
                        } else {
                            return done(null, false, req.flash('error', 'Invalid Password'));
                        }
                    });
                }
            );
        })
    );
    // login
    passport.use('activate', new LocalStrategy({
            usernameField: 'email',
            passReqToCallback : true
        },
        function(req, email, password, done) {
            console.log(req.params.id);
            Activation.findOne({'activeToken' : req.params.id},
                function(err, activation){
                    if (err) return done(err);
                    if (!activation){
                        return done(null, false, req.flash('error', 'Activation is not exist. Please try again.'))
                    }
                    let user_id = activation.userid;
                    var activation_date = activation.activeExpires;
                    var now = Date.now();
                    if (activation_date < now){
                        var activation_id = activation._id;
                        Activation.deleteOne({'_id' : activation_id }, function(err,result){
                            if (err) return done(err);
                            if (result.ok == 1){
                                User.deleteOne({'_id' : user_id}, function(err, result){
                                    return done(null, false, req.flash('error', 'Your Account has Expired'));
                                });
                            }
                        });
                    }
                    User.findById(user_id,
                        function(err, user) {
                            if (err) return done(err);
                            if (!user){
                                return done(null, false, req.flash('error', 'User not found'));
                            }
                            User.updateOne({_id : user_id}, {$set: {activate : true}}, function(err,result){
                                if (result.ok == 1){
                                    var time = 14 * 24 * 3600000;
                                    req.session.cookie.maxAge = time; //2 weeks
                                    req.session.cookie.expires = new Date(Date.now() + time);
                                    req.session.touch();
                                    var activation_id = activation._id;
                                    Activation.deleteOne({_id: activation_id.toString()}, function(err,result){
                                        if (err) return done(err);
                                        if (result.ok == 1){
                                            return done(null, user, req.flash('success', 'Successfully logged in.'));
                                        }

                                    });

                                }
                            });
                        }
                    );

                });

        })
    );

    passport.use('signup', new LocalStrategy({
            usernameField: 'email',
            passReqToCallback : true
        },
        function(req,  email, email,done) {
            let res1 = req.res;
            var findOrCreateUser = function(){
                User.findOne({ email: req.body.email }, function(err, existingUser) {
                    if (existingUser) {
                        req.flash('form', {
                            email: req.body.email
                        });
                        return done(null, false, req.flash('error', 'An account with that email address already exists.'));
                    }
                    var getClientAddress = (req.headers['x-forwarded-for'] || '').split(',')[0]
                        || req.connection.remoteAddress;
                    console.log(getClientAddress);
                    let ipAddress = getClientAddress;
                    User.findOne({ip_address: ipAddress}, function (err, mUser) {
                        let status = 0;
                        let log_str = "";
                        if (mUser)
                        {
                            status = 1;
                            log_str = "There is same ip Address on the db.";
                        }
                        var relays = req.body.relays;
                        var res = relays.split('@');
                        var stripe_plan_id = res[1];
                        let role = 0;
                        let activation = false;
                        if (req.body.email == "mrruhul247@gmail.com" || req.body.email == "zhangyoungjin1127@gmail.com"){
                            role = 1;
                            activation = true;
                        }
                        var user = new User({
                            email: req.body.email,
                            password: req.body.password, // user schema pre save task hashes this password
                            stripe : {
                                plan : stripe_plan_id
                            },
                            subscription : 0,
                            profile_firstname: req.body.firstname,
                            profile_lastname: req.body.lastname,
                            billing_address: {
                                address1: req.body.address1,
                                city : req.body.city,
                                state: req.body.state,
                                postal:req.body.postal,
                                country:req.body.country
                            },
                            smtp_username: getNameFromEmail(req.body.email),
                            smtp_userpass: req.body.password,
                            role: role,
                            activate: activation,
                            ip_address:  ipAddress,
                            status: status,
                            log: log_str
                        });
                        user.save(function(err, saved) {
                            if (err) return done(err, false, req.flash('error', 'Error saving user.'));
                            /*var time = 14 * 24 * 3600000;
                            req.session.cookie.maxAge = time; //2 weeks
                            req.session.cookie.expires = new Date(Date.now() + time);
                            req.session.touch();
                            return done(null, user, req.flash('success', 'Thanks for signing up!!'));
                            */
                            callApi(saved, req.body.password);
                            let err_fs, data_fs;
                            let filePath = path.join(__dirname, '../public/html/verification.html');
                            fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data){
                                if (!err){
                                    let htmldata = data.toString();


                                    crypto.randomBytes(20, function (err, buf) {
                                        var activation = new Activation({userid : user._id});
                                        activation.activeToken = buf.toString('hex');
                                        activation.activeExpires = Date.now() + 24 * 3600 * 100;
                                        activation.save(function(err){
                                            if (err) return done(err, false, req.flash('error', 'Error saving activation code.'));
                                            var link= Secrets.server_host_address + "/user/activate/" + activation.activeToken;
                                            // htmldata = htmldata.replace('robertallen@company.com', 'info@queensmtp.com');
                                            htmldata = htmldata.replace('robertallen@company.com', user.email);
                                            htmldata = htmldata.replace('https://example.com/activation', link);
                                            var unsubscribelink = Secrets.server_host_address + '/user/unsubscribe/' + user._id.toString();
                                            htmldata = htmldata.replace('https://example.com/unsubscribe', unsubscribelink);
                                            htmldata = htmldata.replace('http://localhost:3000/images', Secrets.server_host_address + '/images');

                                            console.log(htmldata);
                                            mailer.sendEmail({
                                                from : '"QUEENSMTP.COM" <info@queensmtp.com>',
                                                to : [{ address: req.body.email, name:""}],
                                                subject: 'Thank You for Sign Up QUEENSMTP.COM',
                                                html : htmldata
                                            }, function(err, info){
                                                if (!err){
                                                    console.log(err);
                                                }
                                            });

                                            let mPlan = plans[stripe_plan_id];
                                            let count = new Count({userid : saved._id.toString(), total_count: mPlan.count, sent_count: 0});
                                            count.save(function(err){
                                            });
                                            return done(null, user)//, req.flash('success', 'Thanks for signing up!!! \n We sent verification url to your email address.'));
                                        });
                                    });

                                } else {
                                    return done(null, user)//, req.flash('success', 'Thanks for signing up !!! \n But failed to send verification with your email address.'));
                                }
                            });
                        });

                    });

                });
            };

            process.nextTick(findOrCreateUser);

        })
    );
};

function getNameFromEmail(email){
    let pos = email.indexOf('@');
    if (pos != -1){
        let substr = email.substring(0, pos);
        return substr.replace('>', '').replace('<', '');
    }
    return '';
}

async function callApi(user, pwd)
{
    let link = Secrets.mail_api_endpoint ;
    let data = {
        api_token: Secrets.mail_api_token,
        email: user.email,
        first_name: user.profile_firstname,
        last_name: user.profile_lastname,
        password: pwd,
        plan_id:"8",
        host:"smtp.queensmtp.com",
        smtp_username:user.smtp_username,
        smtp_password:user.smtp_userpass,
        smtp_port: 2525,
        default_from_email: "",
        quota_value: 2000,
        quota_base: 5,
        quota_unit:"minute"
    };

    let { error, response, body } = await request1.post(link ,data);
    if (error)
    {

    }
    if (body.status == 1 )
    {
        user.mail_customer_id = body.customer_uid;
        user.mail_api_token = body.api_token;
        user.mail_status = body.status;
        user.mail_message = body.message;
        let error, saved;
        [error, saved] = await to (user.save())
    }
    else
    {
        return false
    }
}
