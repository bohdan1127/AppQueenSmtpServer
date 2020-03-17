const {to} = require('await-to-js');
const pe = require('parse-error');
const EmailValidator = require('email-deep-validator');
const emailValidator = new EmailValidator();
module.exports.to = async (promise) => {
    let err, res;
    [err, res] = await to(promise);
    if(err) return [pe(err)];

    return [null, res];
};

module.exports.ReE = function(res, err, code){ // Error Web Response
    if(typeof err == 'object' && typeof err.message != 'undefined'){
        err = err.message;
    }

    if(typeof code !== 'undefined') res.statusCode = code;

    res.setHeader('Content-Type','application/json');
    return res.json({success:false, error: err});
};

module.exports.ReS = function(res, data, code){ // Success Web Response
    let send_data = {success:true};

    if(typeof data == 'object'){
        send_data = Object.assign(data, send_data);//merge the objects
    }

    if(typeof code !== 'undefined') res.statusCode = code;

    return res.json(send_data)
};

module.exports.TE = TE = function(err_message, log){ // TE stands for Throw Error
    if(log === true){
        console.error(err_message);
    }

    throw new Error(err_message);
};


module.exports.removeSpace = TE = function(domain) { // TE stands for Throw Error
    let domain_name = domain;
    domain_name = domain_name.replace(/ /g, "");
    return domain_name;
};

module.exports.checkBounce = TE = async function(email_address){
    const { wellFormed, validDomain, validMailbox } = await emailValidator.verify(email_address);
    if (wellFormed == true && validDomain == true && validMailbox == true){
        return true;
    }
    return false;
};
