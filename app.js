import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const port = 3001;
const app = express();

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});

const rooms = {}; // Keeps track of socket IDs and their rooms

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  function createUniqueRoom(peer1, peer2) {
    const roomId = generateUUID();
    const room = {
      id: roomId,
      peers: [peer1, peer2]
    };

    return room;
  }

  function canJoinRoom(room, peer) {
    return room.peers.includes(peer);
  }

  // Example usage:
  const peer1 = 'peer1-id';
  const peer2 = 'peer2-id';

  const room = createUniqueRoom(peer1, peer2);
  console.log('Room ID:', room.id); // Prints the unique room ID

  // Check if a peer can join the room
  console.log('Can peer1 join?', canJoinRoom(room, peer1)); // true
  console.log('Can peer2 join?', canJoinRoom(room, peer2)); // true
  console.log('Can another peer join?', canJoinRoom(room, 'another-peer-id'));

  socket.on("join_room", (room) => {
    if (!rooms[room]) {
      rooms[room] = new Set();
    }
    rooms[room].add(socket.id);
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on("leave_room", (room) => {
    if (rooms[room]) {
      rooms[room].delete(socket.id);
      socket.leave(room);
      console.log(`Socket ${socket.id} left room ${room}`);
    }
  });

  socket.on("message", ({ room, message, sender }) => {
    if (rooms[room] && rooms[room].has(socket.id)) {
      io.to(room).emit("receive_message", { message, sender });
      console.log(`Message from ${sender} in room ${room}: ${message}`);
    } else {
      console.log(`Socket ${sender} tried to send message to room ${room} without joining it`);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    for (const room of Object.keys(rooms)) {
      rooms[room].delete(socket.id);
      socket.leave(room); // Ensure the socket leaves all rooms it was part of
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
