// authMiddleware.js
module.exports = function (req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }
    next(); // Proceed to the next route if logged in
};
