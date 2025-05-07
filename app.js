// Core Modules & Third-Party Libraries
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override');
const createError = require('http-errors');


// Route Imports
const indexRouter = require('./routes/index');
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/users');
const foodRouter = require('./routes/food');
const testimonialRouter = require('./routes/testimonial');
const requestRouter = require('./routes/request');
const ourTeamsRouter = require('./routes/ourTeams');

// Initialize Express App
const app = express();

// --------------------
// Database Connection
// --------------------
mongoose.connect('mongodb://localhost/plateshare', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --------------------
// View Engine Setup
// --------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --------------------
// Middleware Setup
// --------------------
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));


const requestIp = require('request-ip');
app.use(requestIp.mw());

// --------------------
// Session & Flash
// --------------------
app.use(session({
  secret: 'your-secret-key', // 🔒 Replace with env var in production
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// --------------------
// Global Template Variables
// --------------------
app.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  res.locals.memberId = req.session.memberId || null;
  next();
});


// --------------------
// Routes
// --------------------
app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/users', userRouter);
app.use('/food', foodRouter);
app.use('/testimonial', testimonialRouter);
app.use('/request', requestRouter);
app.use('/ourTeams', ourTeamsRouter);

// --------------------
// Error Handling
// --------------------

// 404 - Not Found
app.use((req, res, next) => {
  next(createError(404));
});

// 500 - Global Error Handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// --------------------
// Export App
// --------------------
module.exports = app;
