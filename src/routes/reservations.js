const express = require('express');
const router = express.Router();
const pool = require('../models/db');

router.post('/', async (req, res) => {
  const { usuario_id, sala_id, data_inicio, data_fim } = req.body;
  try {
    const result = await pool.query('INSERT INTO reservas (usuario_id, sala_id, data_inicio, data_fim, status) VALUES ($1, $2, $3, $4, \'reservada\') RETURNING *', [usuario_id, sala_id, data_inicio, data_fim]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
