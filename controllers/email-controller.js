'use strict';

let Email = require('../models/email');
let Redirect = require('../models/redirect');
let Unsubscribe = require('../models/unsubscribe');

const { to , ReE , ReS} = require('./../utils/util');
const {check, oneOf, validationResult}= require('express-validator');

exports.getEmails = async function(req, res, next){
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
    let err, records;
    return res.render(req.render, {user:req.user, form: form, error: error, });
};
exports.postSetEmailActive = async function(req, res, next){
    let id = req.body.email_id;
    let email,error;
    [error, email] = await to (Email.findById(id).populate("log_email_id"));
    if (error){
        req.flash('error', 'Failed to get user while suspending user');
        return res.redirect(req.redirect.failure);
    }

    if (!email){
        req.flash('error', 'Email does not exist.');
        return res.redirect(req.redirect.failure);
    }
    let logemail = email.log_email_id;
    if (logemail == undefined){
        req.flash('error', 'There is no log email.');
        return res.redirect(req.redirect.failure);
    }
    logemail.status = 1;
    let updated;
    [error, updated] = await to (logemail.save());

    email.review_status = 0;
    [error, updated] = await to (email.save());

    if (error || !updated){
        req.flash('error', 'Failed to set this email to active.');
        return res.redirect(req.redirect.failure);
    }

    req.flash('success', 'Success to email active.');
    return res.redirect(req.redirect.success);
};
exports.postGetEmails = async function(req, res, next){
    let search = req.body.search.value;
    let start = req.body.start;
    let length = req.body.length;
    let err , results, count;
    let regex = RegExp( search);
    let criteria = {$or: [{name : {$regex: regex}},
            {body_html : {$regex: regex}}, {subject : {$regex: regex}}]};
    [err, results] = await to (Email.find(criteria)
        .limit(length).skip(start).populate('destaddr').populate('userid').sort({receive_date: 0}));
    console.log('Error HHH', err);
    if (err)
        return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});
    // for (let i = 0 ; i < results.length; i++){
    //     let result = results[i];
    //     let html_content = '';
    //     for await (const chunk of result.html_content){
    //         html_content += chunk;
    //     }
    //     results[i].html_content = html_content
    // }
    [err, count] = await to (Email.countDocuments(criteria));
    console.log('Error HHH1', err);
    return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count});
};
exports.postGetReviewEmails = async function(req, res, next){
    let search = req.body.search.value;
    let start = req.body.start;
    let length = req.body.length;
    let err , results, count;
    let regex = RegExp( search);
    // let criteria = {$or: [{name : {$regex: regex}},
    //         {body_html : {$regex: regex}}, {subject : {$regex: regex}}]};
    let criteria = {$or: [{name : {$regex: regex}},
            {body_html : {$regex: regex}}, {subject : {$regex: regex}}], review_status: 1};
    [err, results] = await to (Email.find(criteria)
        .limit(length).skip(start).populate('destaddr').populate('userid').sort({receive_date: 0}));

    if (err)
        return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});

    [err, count] = await to (Email.countDocuments(criteria));
    return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count});
};
exports.getTrackEmail = async function(req, res, next){
    console.log('IP Address = ', req._remoteAddress);

    let email_id = req.params.id;
    console.log(email_id);
    let err, m_email;
    [err, m_email] = await to (Email.findById(email_id));
    if (!err && m_email){
        m_email.open_status = 1;
        let saved;
        [err, saved] = await to (m_email.save());
        if (err || !saved){
            console.log('Set Open Status Error');
        }
    }
};
exports.getUnsubscribe = async function(req, res, next){
    let id = req.params.id;
    let form = {},
        error = null,
        formFlash = req.flash('form'),
        errorFlash = req.flash('error');
    let err, email;
    [err, email] = await to (Email.findById(id).populate('destaddr').populate('userid'));
    let unsubscribed = 0, reported = 0;
    if (formFlash.length) {
        form.email = formFlash[0].email;
    }

    if (email){
        email.unsubscribe_status = 1;
        let updated_email;
        [err, updated_email] = await to (email.save());
        if (email.destaddr != undefined && email.destaddr.length > 0 && email.userid != undefined){
            let emailto = email.destaddr[0];
            let emailaddress = emailto.to.address;
            let unsubscribe = new Unsubscribe({userid: email.userid._id, email: emailaddress});
            let updated, err;
            [err, updated] = await to (unsubscribe.save());


            if (updated){
                return res.render(req.render, {form: form, email_id: id, error: error, unsubscribed: true});
            }
            else
            {
                req.flash('error', 'Failed to make you unsubscribe.');
                res.render(req.render, {form: form, error: error, unsubscribed: false})
            }
        }
        else {
            req.flash('error', 'Failed to make you unsubscribe.');
            res.render(req.render, {form: form, error: error, unsubscribed: false})
        }
    }


};
exports.postUnsubscribe = async function(req, res, next){
    let email_id = req.body.email_id;
    if (email_id){
        let email, error;
        [error, email] = await to (Email.findById(email_id));
        if (email){
            email.unsubscribe_status = 1;
            let updated;
            [error, updated] = await to (email.save());
            if (updated){
                req.flash('success','Success to unsubscribe this email.');
                return res.redirect(req.redirect.success + '/' + email_id);
            } else if (error){
                req.flash('success','Success to unsubscribe this email.');
                return res.redirect(req.redirect.failure + '/' + email_id);
            }
        } else if (error){
            req.flash('error','Failed to get email.');
            return res.redirect(req.redirect.failure + '/' + email_id);
        }
    }
    else {
        req.flash('error','Invalid email');
        return res.redirect(req.redirect.failure + '/' + email_id);
    }
};
exports.postReport = async function(req, res, next){
    let email_id = req.body.email_id;
    if (email_id){
        let email, error;
        [error, email] = await to (Email.findById(email_id));
        if (email){
            email.unsubscribe_status = 1;
            email.report_status = 1;
            let updated;
            [error, updated] = await to (email.save());
            if (updated){
                req.flash('success','Success to report this email.');
                return res.redirect(req.redirect.success + '/' + email_id);
            } else if (error){
                req.flash('success','Success to report this email.');
                return res.redirect(req.redirect.failure + '/' + email_id);
            }
        } else if (error){
            req.flash('error','Failed to get email.');
            return res.redirect(req.redirect.failure + '/' + email_id);
        }
    }
    else {
        req.flash('error','Invalid email');
        return res.redirect(req.redirect.failure + '/' + email_id);
    }
};
exports.getRedirectClick = async function(req, res, next){
    let id = req.params.id;
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
    let err,redirect;
    [err, redirect] = await to (Redirect.findById(id).populate("emailid"));

    if (redirect){
        let email = redirect.emailid;
        if (email.click_status == 0){
            let updated;
            email.click_status = 1;
            [err, updated] = await to (email.save());
        }
        return res.redirect(redirect.url);
    }

};