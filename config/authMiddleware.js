const jwt = require("jsonwebtoken");
const SECRET_KEY = "your_secret_key"; // Use the same key as in login

const authenticateAdmin = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).send("Access Denied");

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
        req.admin = verified;
        next();
    } catch (err) {
        res.status(400).send("Invalid Token");
    }
};

module.exports = authenticateAdmin;
