const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer Token

    if (token == null) {
        return res.sendStatus(401); // Se não houver token, retorna não autorizado
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        console.log(user);  // Isso ajudará a ver o que está sendo recebido
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
