const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const players = {};
const COLORS = [0x346c9a, 0x7b365f, 0x36775b, 0xd08c32, 0x9b4dca, 0xe04a4a, 0x2ab7a9, 0xe8a33d];
const SKINS = [0x955a3c, 0x6e422e, 0xb97950, 0xd6a078, 0x8d5438];
const rand = (a) => a[Math.floor(Math.random() * a.length)];

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    const name = (data && data.name || 'Guest').slice(0, 16);
    players[socket.id] = {
      id: socket.id, name,
      x: (Math.random() - 0.5) * 10,
      z: 8 + Math.random() * 6,
      ry: Math.PI, action: '',
      shirt: rand(COLORS), skin: rand(SKINS)
    };
    const others = {};
    for (const id in players) if (id !== socket.id) others[id] = players[id];
    socket.emit('existing-players', others);
    socket.emit('welcome', players[socket.id]);
    socket.broadcast.emit('player-joined', players[socket.id]);
  });

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (!p) return;
    p.x = data.x; p.z = data.z; p.ry = data.ry; p.action = data.action || '';
    socket.broadcast.emit('player-move', { id: socket.id, x: p.x, z: p.z, ry: p.ry, action: p.action });
  });

  socket.on('chat', (msg) => {
    const p = players[socket.id];
    if (!p) return;
    msg = String(msg).slice(0, 200).trim();
    if (!msg) return;
    const payload = { id: socket.id, name: p.name, message: msg, x: p.x, z: p.z, time: Date.now() };
    for (const id in players) {
      const other = players[id];
      const dx = other.x - p.x, dz = other.z - p.z;
      if (id === socket.id || Math.sqrt(dx*dx + dz*dz) < 8) {
        io.to(id).emit('chat-message', payload);
      }
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Running on ' + PORT));
