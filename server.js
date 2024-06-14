const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: 'katherine-medina',
  host: 'localhost',
  database: 'bancosolar',
  password: 'hola',
  port: 5432,
});

// Middleware para manejar el JSON en las solicitudes
app.use(express.json());

app.use(express.static('public'));

// Ruta para obtener la aplicación cliente
app.get('/', (req, res) => {
  // Devuelve el cliente de la aplicación (página HTML, etc.)
  res.send('Cliente de la aplicación disponible en el apoyo de la prueba');
});

// Ruta para crear un nuevo usuario
app.post('/usuario', async (req, res) => {
  const { nombre, balance } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, balance) VALUES ($1, $2) RETURNING *',
      [nombre, balance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al insertar usuario', err);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para obtener todos los usuarios
app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error al obtener usuarios', err);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para actualizar un usuario existente
app.put('/usuario', async (req, res) => {
  const { id, nombre, balance } = req.body;
  try {
    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, balance = $2 WHERE id = $3 RETURNING *',
      [nombre, balance, id]
    );
    if (result.rowCount === 0) {
      res.status(404).send('Usuario no encontrado');
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error al actualizar usuario', err);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para eliminar un usuario
app.delete('/usuario/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      res.status(404).send('Usuario no encontrado');
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error('Error al eliminar usuario', err);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para realizar una nueva transferencia (usando transacción)
app.post('/transferencia', async (req, res) => {
  const { emisor, receptor, monto } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Disminuir el balance del emisor
    const updateEmisor = await client.query(
      'UPDATE usuarios SET balance = balance - $1 WHERE id = $2',
      [monto, emisor]
    );
    // Aumentar el balance del receptor
    const updateReceptor = await client.query(
      'UPDATE usuarios SET balance = balance + $1 WHERE id = $2',
      [monto, receptor]
    );
    // Registrar la transferencia
    const result = await client.query(
      'INSERT INTO transferencias (emisor, receptor, monto, fecha) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [emisor, receptor, monto]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en la transacción de transferencia', err);
    res.status(500).send('Error interno del servidor');
  } finally {
    client.release();
  }
});

// Ruta para obtener todas las transferencias
app.get('/transferencias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transferencias');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error al obtener transferencias', err);
    res.status(500).send('Error interno del servidor');
  }
});

// Captura de errores generales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error interno del servidor');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
