const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../models/db'); // Ajuste o caminho conforme necessário
const jwt = require('jsonwebtoken');

// Endpoint para registrar um novo usuário
router.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const newUser = await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *;",
      [nome, email, senhaHash]
    );

    console.log("Novo usuário cadastrado:", newUser.rows[0]);
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error("Erro ao registrar usuário:", err.message);
    res.status(500).send("Server error");
  }
});

// Endpoint para login de usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const userQuery = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const user = userQuery.rows[0];

    // Verificar se a senha bate com a hash salva no banco
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: "Senha ou Email errado. Tente novamente ou cadastre-se" });
    }

    // Criação do token JWT
    const token = jwt.sign(
      { userId: user.id, nome: user.nome }, // Inclui o nome do usuário no token
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token: token, user: { id: user.id, nome: user.nome, email: user.email }, message: "Usuário logado com sucesso!" });
  } catch (err) {
    console.error("Erro no login:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
