var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var stripeCustomer = require('./plugins/stripe-customer');
var secrets = require('../config/secrets');
var timestamps = require('mongoose-timestamp');
let Usersmtp = require('./usersmtp');
const Schema = mongoose.Schema;

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  total_mail_count : Number,
  remain_count : Number,
  subscription : Number,
  subscription_date: Date,
  role : {
    type: Number,
    default: 0
  },
  activate: { type: Boolean, default: false},
  status: {
    type : Number, // 0 :activate 1:under review   2:suspend
    default: 0
  },
  log: {
    type:String,
    default: ""
  },
  profile_firstname: { type: String, default: '' },
  profile_lastname: { type: String, default: '' },
  profile_picture: { type: String, default: '' },

  smtp_username : String,
  smtp_userpass : String,
  smtp_password_generated: {
    type: Boolean,
    default: false
  },
  billing_address:{
    address1: { type: String, default: ''},
    city : { type:String, default:''},
    state: { type:String, default:''},
    postal:{ type:Number, default: 0},
    country:{ type:String, default:''}
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date,

  daily_count : {
    type: Number,
    default: 100
  },
  hourly_count : {
    type: Number,
    default: 50
  },
  total_sent_count: {
    type: Number,
    default: 0
  },
  monitoring_flag:{
    type: Number,
    default: 0
  },
  unsubscribe_link: {
    type: Boolean,
    default: true
  },
  total_paid: {
    type: Number,
    default: 0
  },
  payment_status : {
    type : Number, //0 : success 1 : failed
    default: 0,
  },
  payment_log : {
    type :String,
    default: 0
  },
  unsubscribed: {
    type: Boolean,
    default: false,
  },
  ip_address: {
    type: String,
    default:"",
  }
});
userSchema.virtual('destsmtps', {
  ref : 'Usersmtp',
  localField: '_id',
  foreignField: 'userid',
  justOne: false
});

var stripeOptions = secrets.stripeOptions;

userSchema.plugin(timestamps);
userSchema.plugin(stripeCustomer, stripeOptions);

/**
 * Hash the password for security.
 * "Pre" is a Mongoose middleware that executes before each user.save() call.
 */

userSchema.pre('save', function(next) {
  var user = this;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

/**
 * Validate user's password.
 * Used by Passport-Local Strategy for password validation.
 */

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

/**
 * Get URL to a user's gravatar.
 * Used in Navbar and Account Management page.
 */

userSchema.methods.gravatar = function(size) {
  if (!size) size = 200;

  if (!this.email) {
    return 'https://gravatar.com/avatar/?s=' + size + '&d=retro';
  }

  var md5 = crypto.createHash('md5').update(this.email).digest('hex');
  return 'https://gravatar.com/avatar/' + md5 + '?s=' + size + '&d=retro';
};

module.exports = mongoose.model('User', userSchema);
