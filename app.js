'use strict';

let express = require('express');
let swig = require('swig');
let subdomainOffset = process.env.SUBDOMAIN_OFFSET || 0;
let secrets = require('./config/secrets');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let session = require('express-session');
let MongoStore = require('connect-mongo')({ session: session });
let mongoose = require('mongoose');
let passport = require('passport');
let bodyParser = require('body-parser');
let compress = require('compression')();
let lodash = require('lodash');
// let Authentication = require('./authentication');
let errorHandler = require('./middleware/error');
let viewHelper = require('./middleware/view-helper');
let flash = require('express-flash');
let cors = require('cors');

let corsOptions = {
  origin: '*'
};
let staticDir;

// setup db
mongoose.set('useCreateIndex', true);
mongoose.connect(secrets.db, { useUnifiedTopology: true,
  useNewUrlParser: true,});
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});


// express setup
let app = express();

if (app.get('env') === 'production') {
  app.locals.production = true;
  swig.setDefaults({ cache: 'memory' });
  staticDir = path.join(__dirname + '/public');
} else {
  app.locals.production = false;
  swig.setDefaults({ cache: false });
  staticDir = path.join(__dirname + '/public');
}

// This is where all the magic happens!
app.engine('html', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.locals._ = lodash;
app.locals.stripePubKey = secrets.stripeOptions.stripePubKey;


app.use(favicon(path.join(__dirname + '/public/favicon.ico')));
app.use(logger('dev'));

app.use(compress);
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(cookieParser());

app.use(express.static(staticDir));
if(app.get('env') !== 'production'){
  app.use('/styles', express.static(__dirname + '/../.tmp/styles'));
  // app.use('/', routes.styleguide);
}

app.use(session({
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 60 * 1000 // 1 minute
  },
  secret: secrets.sessionSecret,
  store: new MongoStore({
    url: secrets.db,
    auto_reconnect: true
  })
}));

// setup passport authentication
app.use(passport.initialize());
app.use(passport.session());
app.set('trust proxy', true);
// other
app.use(flash());
app.use(cors(corsOptions));

let passportMiddleware = require('./middleware/passport');
passportMiddleware(passport);

// setup view helper
app.use(viewHelper);

// setup routes
let routes = require('./routes/routes');
routes(app, passport);

/// catch 404 and forwarding to error handler
app.use(errorHandler.notFound);

/// error handlers
if (app.get('env') === 'development') {
  app.use(errorHandler.development);
} else {
  app.use(errorHandler.production);
}

let server =require('./smtp/server');

// let imap =require('./smtp/imap');
let cron = require('./cron/send');
// let monitor =require('./cron/monitor');

module.exports = app;
