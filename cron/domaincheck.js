let User = require('../models/user');
let Email = require('./../models/email');
let Rate = require('./../models/rate');
let Secrets = require('../config/secrets');
let Setting = require('../models/setting');
let Domain = require('../models/domain');
let cron =  require('cron');
const { to , ReE , ReS} = require('./../utils/util');

let checked_domain_count = 0;
const check_domains = async () => {
    let err, domains, total_count;
    [err, total_count] = await to (Domain.countDocuments({}));
    if (checked_domain_count >= total_count){
        checked_domain_count = 0;
    }
    [err, domains] = await to (Domain.find({}).skip(checked_domain_count).limit(2));
    for (let i = 0 ; i < domains.length; i++){
        let domain = domains[i];
        dns.resolveTxt(domain.name, (err, addresses) => {
            console.log('spf record = ' + addresses.toString());
            domain.spf_verified = true;
            if (addresses != undefined){
                for (let i = 0 ; i < addresses.length; i++){ //TOMODIFY addresses.length
                    let addr = addresses[i][0];
                    console.log('spf record = ' + addr);
                    if (addr == domain.txt_will_record){
                        domain.spf_verified = true;
                    }
                }
            }
            domain.save(function(err){
            });
        });

        dns.resolveTxt(domain.dkim_host_name, (err, dkim_address) => {
            domain.dkim_verified = false;
            if (dkim_address != undefined){
                let m_address = '';
                for (let i = 0 ; i < dkim_address.length; i++){ //TOMODIFY addresses.length
                    for (let j = 0 ; j < dkim_address[i].length ; j++){
                        m_address += dkim_address[i][j];
                    }
                    if (m_address == domain.dkim_record){
                        domain.dkim_verified = true;
                    }
                }
            }
            domain.save(function(err){
            });
        });
        checked_domain_count += 1
    }
    console.log(new Date());
    console.log('Domain Check  Cron log');
};
let cron_job = cron.job("* * * * * *", () => {
    check_domains();
});
cron_job.start();
