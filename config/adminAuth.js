// middleware/adminAuth.js
module.exports = function adminAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  req.flash("error", "Please log in as admin");
  res.redirect("/admin/login");
};
