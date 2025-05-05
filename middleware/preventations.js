module.exports = {
    preventUserIfLoggedIn: (req, res, next) => {
      if (req.session.userId) {
        return res.redirect('/'); // Redirect to user dashboard if already logged in
      }
      return next();
    }
  };
  