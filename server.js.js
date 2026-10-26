const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" }
});

// เก็บรายชื่อเครื่องลูกค้าที่ออนไลน์ (Key: clientId, Value: socket.id)
const activeClients = new Map();

io.on('connection', (socket) => {
  console.log(`มียอดผู้เชื่อมต่อเข้ามา: ${socket.id}`);

  // 1. ฝั่งลูกค้าลงทะเบียนเข้ามา
  socket.on('register-client', (data) => {
    activeClients.set(data.clientId, socket.id);
    console.log(`ลงทะเบียนเครื่องสำเร็จ -> Client ID: ${data.clientId} (Socket: ${socket.id})`);
  });

  // 2. พนักงานส่งคำขอรีโมท / ขอสตรีมหน้าจอไปยังลูกค้า
  socket.on('request-stream', (data) => {
    const targetSocketId = activeClients.get(data.clientId);
    if (targetSocketId) {
      console.log(`พนักงานกำลังขอสตรีมหน้าไปที่เครื่อง: ${data.clientId}`);
      // ส่งสัญญาณบอกลูกค้าให้เริ่มจับภาพหน้าจอ โดยแนบ socket.id ของพนักงานไปด้วย
      io.to(targetSocketId).emit('request-stream', { operatorId: socket.id });
    } else {
      socket.emit('error-message', { message: 'ไม่พบเครื่องปลายทาง หรือเครื่องออฟไลน์อยู่' });
    }
  });

  // 3. รับภาพหน้าจอจากลูกค้า แล้วส่งต่อให้พนักงานที่กำลังรีโมทอยู่ทันที
  socket.on('screen-frame', (data) => {
    if (data.operatorId) {
      io.to(data.operatorId).emit('screen-frame', { image: data.image });
    }
  });

  // 4. ระบบรับ-ส่งข้อความแชทระหว่างพนักงานกับลูกค้า
  socket.on('chat-message', (data) => {
    // ถ้ารับจากพนักงาน ส่งหาลูกค้า (ตาม clientId)
    const targetSocketId = activeClients.get(data.clientId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('chat-message', {
        sender: data.sender,
        message: data.message,
        timestamp: new Date()
      });
    } else {
      // ถ้ารับจากลูกค้า ส่งกลับไปหาพนักงาน (ตาม operatorId)
      if (data.operatorId) {
        io.to(data.operatorId).emit('chat-message', {
          sender: data.sender,
          message: data.message,
          timestamp: new Date()
        });
      }
    }
  });

  // เมื่อมีผู้ใช้งานตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    for (let [clientId, sockId] of activeClients.entries()) {
      if (sockId === socket.id) {
        activeClients.delete(clientId);
        console.log(`เครื่องลูกค้าหลุดการเชื่อมต่อ: ${clientId}`);
        break;
      }
    }
    console.log(`ผู้ใช้งานออกจากการเชื่อมต่อ: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});