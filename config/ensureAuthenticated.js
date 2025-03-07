function ensureAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next(); // User is logged in, proceed to the next route
    }
    res.redirect('/users/login'); // User is not logged in, redirect to login
}

module.exports = ensureAuthenticated;
