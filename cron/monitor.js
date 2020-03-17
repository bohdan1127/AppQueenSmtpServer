let User = require('../models/user');
let Email = require('./../models/email');
let Rate = require('./../models/rate');
let Secrets = require('../config/secrets');
let Setting = require('../models/setting');
let cron =  require('cron');
let BounceEmailCount = require('../models/bounce_email_count');
const { to , ReE , ReS} = require('./../utils/util');
let monitored_count = 0;
let first_time = 0;
const monitor = async () => {
    let error, users, result, total_count;
    [err, total_count] = await to (User.countDocuments({activate: true, monitoring_flag: 0, status:0}));
    // [err, total_count] = await to (User.countDocuments({monitoring_flag: 0, status:0}));
    if (monitored_count >= total_count){
        monitored_count = 0;
    }

    [error, users] = await to (User.find({activate: true, monitoring_flag: 0, status:0}).sort({createdAt: 1}).skip(monitored_count).limit(Secrets.count_user_per_second));
    if (error){
        return 'error';
    }
    let ids = [];
    for (let i = 0; i < users.length; i++){
        ids.push(users[i]._id.toString());
    }
    [err, result] = await to (User.updateMany({_id: ids}, {$set: { monitoring_flag: 1}},{multi: true}));
    if (err || result.ok != 1){
        return;
    }

    for (let i = 0 ;i < users.length; i++){
        monitored_count++;
        let user = users[i];
        let error, rate;

        let nowDate = new Date();
        let beforeDate = null;

        [error, rate] = await to (Rate.findOne({userid: user._id.toString()}));
        if ( rate == undefined)
            rate = new Rate({userid: user._id});
        if (rate.updateDate != undefined){
            beforeDate = rate.updateDate;
        }
        let totalCount, open_count, click_count, bounce_count, unsubscribe_count, report_count;
        let criteria = {userid: user._id.toString()};

        if (beforeDate != undefined){
            [error, totalCount] = await to (Email.countDocuments({userid: user._id.toString(), my_sent_success_date: {$gte: beforeDate}}));
        } else {
            [error, totalCount] = await to (Email.countDocuments({userid: user._id.toString()}));
        }
        if (error){
            break;
        }
        if (totalCount > 0){
            if (beforeDate != undefined){
                [error, open_count] = await to (Email.countDocuments({userid: user._id.toString(), open_status: 1, my_sent_success_date: {$gte: beforeDate}}));
            }
            else {
                [error, open_count] = await to (Email.countDocuments({userid: user._id.toString(), open_status: 1}));
            }

            if (error){
                break;
            }
            if (beforeDate != undefined){
                [error, click_count] = await to (Email.countDocuments({userid: user._id.toString(), click_status: 1, my_sent_success_date: {$gte: beforeDate}}));
            }
            else {
                [error, click_count] = await to (Email.countDocuments({userid: user._id.toString(), click_status: 1}));
            }
            if (error){
                break;
            }

            if (beforeDate != undefined){
                [error, bounce_count] = await to (Email.countDocuments({userid: user._id.toString(), bounce_status: 1, my_sent_success_date: {$gte: beforeDate}}));
                let email_bounce_count;
                [error, email_bounce_count] = await to (BounceEmailCount.countDocuments({userid: user._id.toString(), updatedDate: {$gte: beforeDate}}));
            }
            else {
                [error, bounce_count] = await to (Email.countDocuments({userid: user._id.toString(), bounce_status: 1}));
                let email_bounce_count;
                [error, email_bounce_count] = await to (BounceEmailCount.countDocuments({userid: user._id.toString()}));
                bounce_count += email_bounce_count;
            }
            if (error){
                break;
            }

            if (beforeDate != undefined){
                [error, unsubscribe_count] = await to (Email.countDocuments({userid: user._id.toString(), unsubscribe_status: 1, my_sent_success_date: {$gte: beforeDate}}));
            }
            else {
                [error, unsubscribe_count] = await to (Email.countDocuments({userid: user._id.toString(), unsubscribe_status: 1}));
            }
            if (error){
                break;
            }

            if (beforeDate != undefined){
                [error, report_count] = await to (Email.countDocuments({userid: user._id.toString(), report_status: 1, my_sent_success_date: {$gte: beforeDate}}));
            }
            else {
                [error, report_count] = await to (Email.countDocuments({userid: user._id.toString(), report_status: 1}));
            }
            if (error){
                break;
            }

            var setting_error, setting;
            [setting_error, setting] = await to (Setting.findOne());

            rate.open_rate = open_count * 100 / totalCount;
            rate.click_rate = click_count * 100 / totalCount;
            rate.bounce_rate = bounce_count * 100 / totalCount;
            rate.unsubscribe_rate = unsubscribe_count * 100 / totalCount;
            rate.report_rate = report_count * 100 / totalCount;

            let updated;
            [error, updated] = await to (rate.save());

            //set user under review
            //open rate 5% click rate 5% Bounce rate5% unsubscribe rate 5%
            let open_limit_rate = 5, click_limit_rate = 5, unsubscribe_limit_rate = 5, bounce_limit_rate = 5;
            if (setting){
                open_limit_rate = setting.open_limit_rate;
                click_limit_rate = setting.click_limit_rate;
                unsubscribe_limit_rate = setting.unsubscribe_limit_rate;
                bounce_limit_rate = setting.bounce_limit_rate;
            }
            // if (rate.open_rate <= open_limit_rate
            //     && rate.click_rate <= click_limit_rate
            //     && rate.unsubscribe_rate >= unsubscribe_limit_rate
            //     && rate.bounce_rate >= bounce_limit_rate){

            console.log('Open rate = ', rate.open_rate);
            console.log('Setting Rate = ', open_limit_rate);
            console.log('Unsubscribe Rate = ', rate.unsubscribe_rate);
            console.log('Setting Unsubscribe Rate = ', unsubscribe_limit_rate);
            console.log('Bounce Rate = ', rate.bounce_rate);
            console.log('Setting Bounce Rate = ', bounce_limit_rate);


            if ((rate.unsubscribe_rate > unsubscribe_limit_rate)
                || (rate.bounce_rate > bounce_limit_rate) || (rate.open_rate > 30 && rate.open_rate < open_limit_rate))
            {
                console.log('Condition is ok');
                user.status = 1;
                Users.sendReviewEmail(user);
                let updated_user;
                [error, updated_user] = await to (user.save());
            }
        }
    }
    if (first_time == 0){
        [err, result] = await to (User.updateMany({} , {$set: { monitoring_flag: 0}},{multi: true}));
        if (err || result.ok != 1){
            return;
        }
        first_time = 1;
    }
    else {
        [err, result] = await to (User.updateMany({_id: ids}, {$set: { monitoring_flag: 0}},{multi: true}));
        if (err || result.ok != 1){
            return;
        }
    }
    console.log(new Date());
    console.log('Monitor Cron log');
};
let cron_job = cron.job("* * * * * *", () => {
    monitor();
});
cron_job.start();
