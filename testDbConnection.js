const pool = require('./src/models/db'); // Substitua 'path_to/db' pelo caminho correto para o seu arquivo db.js

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conexão bem-sucedida, data e hora atual do servidor:', res.rows[0]);
    }
    pool.end(); // Encerra a conexão com o banco de dados
});
