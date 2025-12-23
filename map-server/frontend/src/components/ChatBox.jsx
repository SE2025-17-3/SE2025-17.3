// frontend/src/components/ChatBox.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';

const ChatBox = () => {
  const socket = useSocket();
  // -----------------------
  
  const { user, isLoggedIn } = useAuth();
  const { currentTeam } = useTeam();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('global');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [teamUnread, setTeamUnread] = useState(0);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const formatTime = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Logic nhận tin nhắn & Load history
  useEffect(() => {
    if (!socket || !isLoggedIn || !currentTeam) return;
    socket.emit('chat:subscribe', { teamId: currentTeam._id });
  }, [socket, isLoggedIn, currentTeam]);

  useEffect(() => {
    if (!socket || !isLoggedIn) return;

    setMessages([]);
    setHasMore(true);

    const joinData = { scope: activeTab };
    if (activeTab === 'team' && currentTeam) joinData.teamId = currentTeam._id;
    socket.emit('chat:join', joinData);

    const handleHistory = (hist) => {
      setMessages(hist);
      if (hist.length < 100) setHasMore(false);
      setTimeout(scrollToBottom, 100);
    };

    const handleReceive = (msg) => {
      const isGlobal = msg.scope === 'global';
      const isTeam = msg.scope === 'team' && msg.teamId === currentTeam?._id;
      const isCorrectScope = (activeTab === 'global' && isGlobal) ||
                             (activeTab === 'team' && isTeam);
      if (isCorrectScope) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
      if (isTeam && (activeTab !== 'team' || !isOpen)) {
        setTeamUnread((prev) => prev + 1);
      }
    };

    const handleMoreData = (moreMsgs) => {
      if (moreMsgs.length === 0) {
        setHasMore(false);
        setIsLoadingMore(false);
        return;
      }
      const container = messagesContainerRef.current;
      const oldScrollHeight = container.scrollHeight;

      setMessages((prev) => [...moreMsgs, ...prev]);
      setIsLoadingMore(false);

      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - oldScrollHeight;
        }
      }, 0);
    };

    socket.on('chat:history', handleHistory);
    socket.on('chat:receive', handleReceive);
    socket.on('chat:moreData', handleMoreData);

    return () => {
      socket.off('chat:history', handleHistory);
      socket.off('chat:receive', handleReceive);
      socket.off('chat:moreData', handleMoreData);
    };
  }, [socket, activeTab, currentTeam, isLoggedIn]);

  useEffect(() => {
    if (activeTab === 'team' && isOpen) {
      setTeamUnread(0);
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsOpen(false);
    }
  }, [isLoggedIn]);

  // 2. Gửi tin nhắn
  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (activeTab === 'team' && !currentTeam) return;

    // Giờ socket đã tồn tại, dòng này sẽ chạy tốt
    socket.emit('chat:send', {
      content: input,
      scope: activeTab,
      teamId: activeTab === 'team' ? currentTeam?._id : null
    });
    setInput('');
  };

  // 3. Xử lý cuộn để tải thêm
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && !isLoadingMore && hasMore && messages.length > 0) {
      setIsLoadingMore(true);
      socket.emit('chat:loadMore', {
        scope: activeTab,
        teamId: activeTab === 'team' ? currentTeam?._id : null,
        oldestMessageId: messages[0]._id 
      });
    }
  };

  if (!isLoggedIn) return null;

  const teamBadge = teamUnread > 9 ? '9+' : teamUnread > 0 ? String(teamUnread) : '';

  return (
    <div 
        className="fixed bottom-24 left-4 z-[1100] flex flex-col items-start font-sans"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative mb-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95"
      >
        💬
        {teamBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {teamBadge}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="bg-white w-80 h-96 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fade-in-down">
          <div className="flex bg-gray-100 border-b">
            <button 
              className={`flex-1 py-2 text-sm font-bold ${activeTab === 'global' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('global')}
            >
              Global
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold ${activeTab === 'team' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('team')}
              disabled={!currentTeam}
              title={!currentTeam ? "Join a team to chat" : ""}
            >
              Team {currentTeam ? "" : "(off)"}
              {teamBadge && (
                <span className="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1 align-middle">
                  {teamBadge}
                </span>
              )}
            </button>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50"
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {isLoadingMore && <div className="text-center text-xs text-gray-400 py-1">Đang tải tin cũ...</div>}
            
            {messages.map((msg, index) => {
              const sender = msg?.sender;
              const senderId = sender?._id;
              const isMe = senderId && user?._id ? senderId === user._id : false;
              const displayName = sender?.displayName || 'Nguoi dung';
              const avatarUrl = sender?.avatarUrl || '/default-avatar.png';
              const timeLabel = formatTime(msg.createdAt || msg.timestamp || msg.sentAt);
              return (
                <div key={msg._id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {!isMe && (
                      <img 
                        src={avatarUrl} 
                        className="w-4 h-4 rounded-full" 
                        alt="ava" 
                        onError={(e) => e.target.src = '/default-avatar.png'}
                      />
                    )}
                    <span className="text-[10px] text-gray-500 font-bold">
                      {isMe ? 'Ban' : displayName}
                    </span>
                    {timeLabel && (
                      <span className="text-[10px] text-gray-400">{timeLabel}</span>
                    )}
                  </div>
                  <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm break-words ${isMe ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-2 border-t bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={200}
            />
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Gửi</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBox;