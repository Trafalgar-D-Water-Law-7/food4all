var express = require('express');
var createError = require('http-errors');
const mongoose = require("mongoose");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require("express-session");
var flash = require('express-flash');

var indexRouter = require('./routes/index');
var adminRoutes = require('./routes/admin');
var userRoutes = require('./routes/users');
var foodRouter = require('./routes/food')
var testamonialRouter = require('./routes/testimonial')
var requestRoutes = require('./routes/request')


const app = express();

// Database Connection
mongoose.connect('mongodb://localhost/plateshare', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware Setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
const methodOverride = require('method-override');
app.use(methodOverride('_method'));


// Session & Flash
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));
app.use(flash());

// Set up routers
app.use('/', indexRouter);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);
app.use('/food', foodRouter);
app.use('/testimonial', testamonialRouter);
app.use('/request', requestRoutes);

// Handle 404
app.use(function (req, res, next) {
  next(createError(404));
});

// Global Error Handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Export App
module.exports = app;
