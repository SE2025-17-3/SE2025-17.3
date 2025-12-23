// map-server/backend/src/socket/chatHandler.js 

import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';

// Bộ nhớ tạm để chặn spam (1 giây 1 tin)
const userLastChatTime = new Map(); 

export default (io, socket) => {
  
  // 1. Join Room & Lấy 100 tin mới nhất
  socket.on('chat:join', async ({ scope, teamId }) => {
    try {
      const query = { scope };
      
      if (scope === 'team') {
        if (!teamId) return;
        query.teamId = teamId;
        socket.join(`team_${teamId}`);
      } else {
        socket.join('global');
      }

      // Lấy 100 tin mới nhất
      const messages = await ChatMessage.find(query)
        .sort({ _id: -1 }) // Sắp xếp mới nhất lên đầu để lấy limit
        .limit(100)
        .populate('sender', 'username displayName avatarUrl');

      // Đảo ngược lại (Cũ -> Mới) để hiển thị đúng thứ tự thời gian
      socket.emit('chat:history', messages.reverse());
    } catch (err) {
      console.error("Chat join error:", err);
    }
  });

    // Subscribe to team room for realtime badge updates (no history)
  socket.on('chat:subscribe', ({ teamId }) => {
    if (!teamId) return;
    socket.join(`team_${teamId}`);
  });

// 2. Tải thêm tin nhắn cũ (Khi cuộn lên trên)
  socket.on('chat:loadMore', async ({ scope, teamId, oldestMessageId }) => {
    try {
      const query = { scope };
      if (scope === 'team') query.teamId = teamId;

      // Logic: Tìm những tin nhắn có ID nhỏ hơn (cũ hơn) ID đang hiển thị trên cùng
      if (oldestMessageId) {
        query._id = { $lt: oldestMessageId };
      }

      const moreMessages = await ChatMessage.find(query)
        .sort({ _id: -1 })
        .limit(20) // Mỗi lần tải thêm 20 tin
        .populate('sender', 'username displayName avatarUrl');

      // Gửi về frontend (đảo ngược lại cho đúng thứ tự)
      socket.emit('chat:moreData', moreMessages.reverse());
    } catch (err) {
      console.error("Chat loadMore error:", err);
    }
  });

  // 3. Gửi tin nhắn mới
  socket.on('chat:send', async (data) => {
    const userId = socket.request.session.userId;
    if (!userId) return;

    const { content, scope, teamId } = data;

    // Rate Limit: Chặn spam 1s
    const now = Date.now();
    if (now - (userLastChatTime.get(userId) || 0) < 1000) {
        return; // Bỏ qua nếu chat quá nhanh
    }
    userLastChatTime.set(userId, now);

    if (!content || !content.trim()) return;

    try {
      const newMessage = await ChatMessage.create({
        sender: userId,
        content: content,
        scope: scope,
        teamId: scope === 'team' ? teamId : null
      });

      await newMessage.populate('sender', 'username displayName avatarUrl');

      const room = scope === 'team' ? `team_${teamId}` : 'global';
      io.to(room).emit('chat:receive', newMessage);
    } catch (err) {
      console.error('Chat send error:', err);
    }
  });

  // 4. Xử lý Ping đồng đội
  socket.on('team:ping', (data) => {
    const userId = socket.request.session.userId;
    if (!userId) {
        console.log("❌ Ping failed: No userId in session");
        return;
    }

    const { gx, gy, teamId } = data;
    console.log(`📡 Server received PING from ${userId} to Team ${teamId} at (${gx}, ${gy})`);

    // Gửi cho Room
    io.to(`team_${teamId}`).emit('team:ping', { 
        gx, 
        gy, 
        userId 
    });
  });
  // --------------------------------------------------------------
  
};