
import React, { useState, useRef, useEffect } from 'react';
import { Session, Student } from '../types';
import { getChatResponse } from '../services/geminiService';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

interface ChatBotProps {
  students: Student[];
  activeSessions: Session[];
  history: Session[];
}

const ChatBot: React.FC<ChatBotProps> = ({ students, activeSessions, history }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hello! I'm your Library Assistant. How can I help you manage the facility today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const response = await getChatResponse(userMsg, students, activeSessions, history);
    
    setMessages(prev => [...prev, { role: 'bot', text: response }]);
    setIsLoading(false);
  };

  const quickActions = [
    "Library occupancy status?",
    "Check overdue policy",
    "Identify active Level 400s"
  ];

  return (
    <div className="fixed bottom-24 right-6 z-[150] md:bottom-10 md:right-10 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[320px] sm:w-[380px] h-[500px] bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-slate-800 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-10 duration-500">
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-indigo-900 to-[#0f172a] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-[#0f172a]">
                <i className="fas fa-robot text-lg"></i>
              </div>
              <div>
                <h4 className="text-white font-black text-xs uppercase tracking-widest leading-none">Library AI</h4>
                <p className="text-indigo-400 text-[9px] font-bold uppercase mt-1">Librarian's Co-Pilot</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-700 flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-2 flex space-x-2 overflow-x-auto no-scrollbar">
            {quickActions.map(action => (
              <button
                key={action}
                onClick={() => { setInput(action); }}
                className="whitespace-nowrap px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-700 transition-all"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-slate-800">
            <div className="relative group">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="w-full pl-6 pr-14 py-4 bg-white/5 border border-slate-800 rounded-2xl text-white text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-600"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center disabled:opacity-50"
              >
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 relative ${
          isOpen 
          ? 'bg-rose-500 text-white rotate-90' 
          : 'bg-amber-500 text-[#0f172a] hover:bg-amber-400'
        }`}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} text-xl md:text-2xl`}></i>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-[#f8fafc]">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
