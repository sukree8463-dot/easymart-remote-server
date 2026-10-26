const { io } = require("socket.io-client");
const screenshot = require("screenshot-desktop");
const readline = require("readline");

// เชื่อมต่อเข้าไปที่ Signaling Server
const socket = io("http://localhost:3000");

const clientId = "CLIENT-" + Math.floor(Math.random() * 10000);
let currentOperatorId = null;

// เตรียมระบบพิมพ์ข้อความตอบกลับจากฝั่ง Client ผ่าน Terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

socket.on("connect", () => {
  console.log(`Connected! Client ID: ${clientId}`);
  socket.emit("register-client", { clientId });
  
  console.log("พิมพ์ข้อความแล้วกด Enter เพื่อส่งหาพนักงานซัพพอร์ต:");
  promptChat();
});

// ฟังก์ชันพิมพ์แชทฝั่งลูกค้า
function promptChat() {
  rl.question('> ', (message) => {
    if (message.trim() && currentOperatorId) {
      socket.emit("chat-message", {
        sender: clientId,
        operatorId: currentOperatorId,
        message: message
      });
    }
    promptChat();
  });
}

// เมื่อพนักงานขอสตรีมหน้าจอ
socket.on("request-stream", (data) => {
  currentOperatorId = data.operatorId;
  console.log("\n[แจ้งเตือน]: พนักงานเริ่มเชื่อมต่อและสตรีมหน้าจอของคุณแล้ว");
  
  // ส่งภาพหน้าจอทุกๆ 1 วินาที
  const streamInterval = setInterval(async () => {
    try {
      const imgBuffer = await screenshot({ format: 'jpeg' });
      const base64Image = imgBuffer.toString('base64');
      
      socket.emit("screen-frame", {
        operatorId: currentOperatorId,
        image: base64Image
      });
    } catch (err) {
      console.error("ไม่สามารถจับภาพหน้าจอได้:", err);
    }
  }, 1000);

  socket.on("disconnect", () => {
    clearInterval(streamInterval);
  });
});

// รับข้อความแชทจากพนักงาน
socket.on("chat-message", (data) => {
  console.log(`\n[${data.sender}]: ${data.message}`);
  process.stdout.write('> ');
});