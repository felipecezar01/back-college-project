const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const authenticateToken = require('../../middlewares/authenticateToken'); // Certifique-se que o caminho está correto
const fs = require('fs');
const os = require('os');
const { PassThrough } = require('stream');

// Rota principal para listar salas
router.get('/', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const offset = (page - 1) * limit;
  const searchTerm = req.query.search || '';
  const localidades = req.query.localidades ? req.query.localidades.split(',') : [];
  const onlyAvailable = req.query.available === 'true'; // Para filtrar por disponibilidade

  try {
    let queryParams = [`%${searchTerm}%`];
    let whereClauses = ['nome ILIKE $1'];

    if (localidades.length > 0) {
      queryParams.push(localidades);
      whereClauses.push(`localidade = ANY($${queryParams.length}::text[])`);
    }

    if (onlyAvailable) {
      whereClauses.push('disponibilidade = true');
    }

    queryParams.push(limit, offset);

    const query = `
    SELECT id, nome, localidade, imagem_url, disponibilidade, capacidade, quantidade_alugueis
    FROM salas
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY id LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
`;

    const result = await pool.query(query, queryParams);
    console.log(result.rows); // Isto mostrará os dados retornados pela query
    const totalResult = await pool.query(
        `SELECT COUNT(*) FROM salas WHERE ${whereClauses.join(' AND ')}`,
        queryParams.slice(0, -2)
    );

    const totalRows = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalRows / limit);

    console.log({ rooms: result.rows, totalPages, currentPage: page });
    res.status(200).json({ rooms: result.rows, totalPages, currentPage: page });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/generate-report', authenticateToken, async (req, res) => {
  try {
    // Chama a stored procedure que prepara os dados
    await pool.query("CALL get_room_report()");

    // Após chamar a procedure, buscar os dados da tabela temporária
    const { rows } = await pool.query("SELECT * FROM temp_room_report");
    
    // Aqui você poderia converter esses dados em um arquivo TXT
    let reportData = "ID, Nome, Total de Aluguéis\n" + rows.map(row => `${row.id}, ${row.nome}, ${row.quantidade_alugueis}`).join('\n');
    
    // Utiliza stream para enviar o arquivo diretamente
    const readStream = new PassThrough();
    readStream.end(reportData);

    res.set('Content-Type', 'text/plain');
    res.set('Content-Disposition', 'attachment; filename="room_report.txt"');
    readStream.pipe(res);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).send('Erro ao gerar relatório');
  }
});


// Rota para alugar uma sala
router.post('/rent/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
      const check = await pool.query("SELECT disponibilidade, quantidade_alugueis FROM salas WHERE id = $1", [id]);
      if (check.rows.length > 0 && check.rows[0].disponibilidade === false) {
          return res.status(400).json({ message: "Sala já está alugada" });
      }

      // Atualiza a sala como alugada e incrementa a quantidade de aluguéis
      await pool.query(
        "UPDATE salas SET disponibilidade = false, id_usuario = $1, quantidade_alugueis = quantidade_alugueis + 1 WHERE id = $2", 
        [userId, id]
      );

      res.json({ message: "Sala alugada com sucesso!" });
  } catch (err) {
      console.error(`Erro ao alugar a sala: ${err.message}`);
      res.status(500).send("Erro ao alugar a sala");
  }
});



// Rota para desalugar uma sala
router.post('/unrent/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
      const sala = await pool.query("SELECT id_usuario FROM salas WHERE id = $1", [id]);
      if (sala.rows.length === 0) {
          return res.status(404).json({ message: "Sala não encontrada" });
      }
      if (sala.rows[0].id_usuario !== userId) {
          return res.status(403).json({ message: "Somente o usuário que alugou a sala pode desalugá-la" });
      }
      // Atualiza a sala para estar disponível e mantém o id_usuario como NULL
      await pool.query("UPDATE salas SET disponibilidade = true, id_usuario = NULL WHERE id = $1", [id]);
      res.json({ message: "Sala desalugada com sucesso!" });
  } catch (err) {
      console.error(`Erro ao desalugar a sala: ${err.message}`);
      res.status(500).send("Erro ao desalugar a sala");
  }
});

// Rota para chamar a função de contar salas disponíveis
router.get('/count-available', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT contar_salas_disponiveis() AS salas_disponiveis;');
    res.json({ availableRoomCount: parseInt(result.rows[0].salas_disponiveis) });
  } catch (error) {
    console.error('Erro ao obter contagem de salas disponíveis:', error);
    res.status(500).json({ error: 'Erro ao obter contagem de salas disponíveis' });
  }
});


module.exports = router;
