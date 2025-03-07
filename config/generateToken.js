// Generate a 6-digit token
function generateToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = generateToken;
