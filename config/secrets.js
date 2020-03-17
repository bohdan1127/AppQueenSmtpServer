module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/smtp_server',

  sessionSecret: process.env.SESSION_SECRET || 'change this',
  
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || ''
  },
  server_host_address: 'https://app.queensmtp.com',
  // server_host_address: 'http://localhost:3000',
  new_email_sending_limit: 50,
  my_smtp_options:{
    port : 587,
    alternative_port: 465,
    encryption: 1
  },
  global_smtp_options:{
    host : 'queensmtp.com',
    port : 465,
    auth_user : 'info@queensmtp.com',
    auth_pass : '(l)p(yE_QJv1',
  },
  virtual_min: {
    link: "https://root:Gd80A0FKE9z03Womwk@rnsm.net:10000/virtual-server/remote.cgi",
    id: "root",
    pwd: "Gd80A0FKE9z03Womwk"
  },
  // bounce_email : 'testbounce@queensmtp.com',
  // bounce_email : 'bounce@kilagbe.com',
  //bounce_email : 'bouncequeensmtp@rnsm.net',
  bounce_email : 'bounce@ms3.rnsm.net',

  count_user_per_second : 1,
  count_monitor_email_per_second: 10,
  count_sendemail_per_second : 1,

  bounce_smtp_options:{
    ssl_host : 'rnsm.net',
    ssl_outgoing_port : 465,
    ssl_incoming_port : 993,
    ssl_incoming_pop3_port: 995 ,
    non_ssl_host: 'mail.kilagbe.com',
    nonssl_outgoing_port: 26,
    nonssl_incoming_port: 143 ,
    nonssl_incoming_pop3_port: 110 ,
    auth_user : 'bouncequeensmtp@rnsm.net',
    auth_pass : 'MlkO#cub#teu',
  },
  // smtp_options:{
  //   host : 'qinemail.xyz',
  //   port : 2626,
  //   auth_user : 'qinemail.xyz',
  //   auth_pass : '?8@-6wXe(^($@$F^',
  // },
  smtp_options:{
    host : 'queensmtp.com',
    ssl_outgoing_port : 465,
    ssl_incoming_port : 993,
    ssl_incoming_pop3_port: 110,
    nonssl_outgoing_port: 26,
    nonssl_incoming_port: 143,
    nonssl_incoming_pop3_port: 143,
    auth_user : 'info@queensmtp.com',
    auth_pass : '(l)p(yE_QJv1',
  },
  stripeOptions: {
    //apiKey: process.env.STRIPE_KEY || 'sk_test_iU2ViIVqs0x7mYwcQTT74HH1',
    // apiKey: process.env.STRIPE_KEY || 'sk_test_R0pZGL32Iai37pVkWFFen6XK00wq6CrTe1',
    apiKey: process.env.STRIPE_KEY || 'sk_live_vEOeRP4ASVHXpg5o127KEc4A',


    //stripePubKey: process.env.STRIPE_PUB_KEY || 'pk_test_RIJGBOa6gJbou5BE3SVX8NVl',
    // stripePubKey: process.env.STRIPE_PUB_KEY || 'pk_test_e4DYJYs8liwJf79UG5NVRIjU00bakCuj7x',
    stripePubKey: process.env.STRIPE_PUB_KEY || 'pk_live_wdLkHLO9q8eGXLkSX9MRxVX5',

    defaultPlan: 'free',
    plans: ['free', '20000_emails_month', '50000_emails_month', '100000_emails_month', '200000_emails_month', '400000_emails_month'],
    planData: {
      'free': {
        id: 0,
        name: 'free',
        price: 0,
        count: 6000,
        overage_price: 0.0,
        currency: 'usd',
        interval: 'month',
        ipType: 'shared'
      },
      '20000_emails_month': {
        id: 1,
        name: '20000_emails_month',
        price: 6,
        count: 20000,
        overage_price: 0.0019,
        currency: 'usd',
        interval: 'month',
        ipType: 'shared'
      },
      '50000_emails_month': {
        id: 2,
        name: '50000_emails_month',
        price: 10,
        count: 50000,
        overage_price: 0.00175,
        currency: 'usd',
        interval: 'month',
        ipType: 'shared'
      },
      '100000_emails_month': {
        id: 3,
        name: '100000_emails_month',
        price: 20,
        count: 100000,
        overage_price: 0.002,
        currency: 'usd',
        interval: 'month',
        ipType: 'dedicated'
      },
      '200000_emails_month': {
        id: 4,
        name: '200000_emails_month',
        price: 30,
        count: 200000,
        overage_price: 0.00125,
        currency: 'usd',
        interval: 'month',
        ipType: 'dedicated'
      },
      '400000_emails_month': {
        id: 5,
        name: '400000_emails_month',
        price: 80,
        count: 400000,
        overage_price: 0.00113,
        currency: 'usd',
        interval: 'month',
        ipType: 'dedicated'
      }
    }
  },

  googleAnalytics: process.env.GOOGLE_ANALYTICS || ''
};
