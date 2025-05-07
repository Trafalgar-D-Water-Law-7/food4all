// middleware/auth.js

module.exports = {
    ensureUserLoggedIn: (req, res, next) => {
      if (req.session.userId) {
        return next();
      }
      req.flash('error', 'Please login to access this page.');
      return res.redirect(req.get('Referer') || '/'); // fallback if no referer
    },

    ensureMemberLoggedIn: (req, res, next) => {
        if (req.session.memberId) {
          return next();
        }
        req.flash('error', 'Please login to access this page.');
        return res.redirect(req.get('Referer') || '/'); // fallback if no referer
      },
  
    preventUserIfLoggedIn: (req, res, next) => {
      if (req.session.userId) {
        req.flash('success', 'You are already logged in.');
        return res.redirect(req.get('Referer') || '/users/user'); // fallback if no referer
      }
      return next();
    },

    preventMemberIfLoggedIn: (req, res, next) => {
        if (req.session.memberId) {
          req.flash('success', 'You are already logged in.');
          return res.redirect(req.get('Referer') || '/ourTeams/memberProfile'); // fallback if no referer
        }
        return next();
      }
  };
  