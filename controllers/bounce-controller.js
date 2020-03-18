var User = require('../models/user');
var Domain = require('../models/domain');
var Record = require('../models/record');
var path = require('path');
const dns = require('dns');
var cp = require('child_process'), assert = require('assert');
const { to , ReE , ReS, removeSpace} = require('./../utils/util');
const {check, oneOf, validationResult}= require('express-validator');
let fs = require('fs');
let mailer = require('./../utils/mailer');
let Secrets = require('../config/secrets');
let request = require('request-promise');
let request1 = require('./request');

exports.createUserDomain = async function(username, passwd, domain) {
    let link = Secrets.virtual_min.link + "?program=create-user&domain="+ domain + "&user=" + username + "&json=1" + "&pass=" + passwd;
    // let link = Secrets.virtual_min.link + "?program=create-user&domain="+ domain + "&user=" + username + "&json=1" + "&encpass=E6C9268F2C8A2BD00E7AD265E69F8431";
    let password = encodeURIComponent(Secrets.virtual_min.pwd);
    link = link.replace(Secrets.virtual_min.pwd, password);
    let { error, response, body } = await request1.get(link);
    if (error)
    {
        return "error";
    }
    if (body.status == "success" )
    {
        return true;
    }
    else
    {
        return false
    }
};

exports.existUserDomain = async function(username, domain){
    let link = Secrets.virtual_min.link + "?program=list-users&domain="+ domain + "&user=" + username + "&json=1";

    let password = encodeURIComponent(Secrets.virtual_min.pwd);
    link = link.replace(Secrets.virtual_min.pwd, password);
    let { error, response, body } = await request1.get(link);
    if (error)
    {
        return "error";
    }
    if (body.data.length > 2 )
    {
        return true;
    }
    else
    {
        return false
    }
};