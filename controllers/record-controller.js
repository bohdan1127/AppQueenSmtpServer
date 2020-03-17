'use strict';

var Record = require('../models/record');
const { to , ReE , ReS} = require('./../utils/util');
const {check, oneOf, validationResult}= require('express-validator');

exports.getRecords = async function(req, res, next){
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
  let err, records;
  return res.render(req.render, {user:req.user, form: form, error: error, });
};

exports.deleteRecord = async function(req, res, next){
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  let record_id = req.body.record_id;
  let err, record;
  [err, record] = await to (Record.findById(record_id));

  if (err){
    req.flash('error', 'Failed to delete record');
    res.redirect(req.redirect.failure);
  }

  if (!record){
    req.flash('error', 'There is no record.');
    return res.redirect(req.redirect.failure);
  }

  let result;
  [err, result] = await to (Record.deleteOne({_id: record_id}));

  if (result.ok != 1 || err){
    req.flash('error', 'Failed to delete record.');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', { msg: 'Success to delete record.' });
  return res.redirect(req.redirect.success);
};
exports.addRecord = async function(req, res, next){
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(req.redirect.failure);
  }

  let err, created, existing;
  let domain_name = req.body.domain;
  domain_name = domain_name.replace(/ /g, "");
  [err, existing] = await to (Record.findOne({name : domain_name}));
  if (existing || err){
    req.flash('error', 'This record already exists.');
    return res.redirect(req.redirect.failure);
  }

  let record = new Record();
  record.name = req.body.domain;
  [err, created] = await to (record.save());
  if (err){
    req.flash('error', 'Failed to add new record');
    return res.redirect(req.redirect.failure);
  }
  req.flash('success', { msg: 'Success to add record.' });
  return res.redirect(req.redirect.success);
};
exports.postGetRecords = async function(req, res, next){
  let search = req.body.search.value;
  let start = req.body.start;
  let length = req.body.length;
  let err , results, count;
  let regex = RegExp( search);

  [err, results] = await to (Record.find({$or: [{name : {$regex: regex}}]}).limit(length).skip(start));
  if (err)
    return res.json({'data': [], 'recordsTotal': 0, 'recordsFiltered': 0});

  [err, count] = await to (Record.countDocuments({$or: [{name : {$regex: regex}}]}));
  return res.json({'data': results, 'recordsTotal': count, 'recordsFiltered': count});
};