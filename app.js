var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const shopController = require('./controllers/shop');
const isAuth = require('./middleware/is-auth');

var admin = require('./routes/admin');
var shop = require('./routes/shop');
var auth = require('./routes/auth');

const mongoose = require('mongoose');

const User = require('./models/user');

// const MONGODB_URI = 'mongodb+srv://hspreet:hmsaini@cluster0-6wxah.mongodb.net/shop';
const MONGODB_URI = 'mongodb://hspreet:hmsaini123@ds211096.mlab.com:11096/shop';

var app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    // cb(null, new Date().toISOString() + '-' + file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use((req, res, next) => {
//   User.findById('5c8623b8259d9b25c4358e14')
//     .then(user => {
//       req.user = user;
//       next();
//     })
//     .catch(err => console.log(err));
// });


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));

app.use(cookieParser());

app.use(multer({
  storage: fileStorage,
  fileFilter: fileFilter
  // dest: 'uploads'
}).single('image'));

app.use("/public", express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: false,
  store: store
}));

// app.use(csrfProtection);
app.use(flash());

// set to all render functions by using locals before the routes
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  // res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    // .catch(err => console.log(err));
    .catch(err => {
      throw new Error(err);
    });
});

app.post('/create-order', isAuth, shopController.postOrder);

app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// routes
app.use('/admin', admin);
app.use('/', shop);
app.use('/', auth);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

mongoose
  .connect(MONGODB_URI).then(result => {

    // User.findOne().then(user => {
    //   if (!user) {
    //     const user = new User({
    //       name: 'happy',
    //       email: 'happy@test.com',
    //       cart: {
    //         items: []
    //       }
    //     });
    //     user.save();
    //   }
    // })
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;