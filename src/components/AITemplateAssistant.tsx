import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, Loader2, ListChecks, MessageSquare, Bot, Upload, FileType, CheckCircle2 } from 'lucide-react';
import { generateTemplatePrompt, analyzeDocxForTemplate, extractDocxStructure, AIResponse } from '../services/geminiService';
import mammoth from 'mammoth';

interface AITemplateAssistantProps {
  onClose: () => void;
  onSaveTemplate: (template: any) => void;
  onApplyDocData: (data: any) => void;
  userId: string;
}

export const AITemplateAssistant: React.FC<AITemplateAssistantProps> = ({ onClose, onSaveTemplate, onApplyDocData, userId }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string, type?: string, questions?: string[], data?: any }[]>([
    { role: 'model', content: 'Chào bạn! Tôi có thể giúp bạn tạo mẫu văn bản hoặc bóc tách dữ liệu từ file Word hiện có. Bạn cần giúp gì?' }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadOption, setShowUploadOption] = useState(false);
  const [uploadMode, setUploadMode] = useState<'template' | 'extraction'>('template');
  const [customFileName, setCustomFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSave = () => {
    const template = (window as any).__lastGeneratedTemplate;
    if (template) {
      onSaveTemplate(template);
      onClose();
    }
  };

  const handleApplyData = (data: any) => {
    onApplyDocData(data);
    onClose();
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await generateTemplatePrompt(userMsg, history);
      
      if (response.type === 'template') {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: response.content,
          type: 'template'
        }]);
        (window as any).__lastGeneratedTemplate = {
          ...response.template,
          userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else if (response.type === 'questions') {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: response.content,
          type: 'questions',
          questions: response.questions
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.content }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: 'Rất tiếc, đã có lỗi xảy ra: ' + (error as Error).message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', content: 'Chào bạn! Tôi có thể giúp bạn tạo mẫu văn bản hoặc bóc tách dữ liệu từ file Word hiện có. Bạn cần giúp gì?' }]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: uploadMode === 'template' 
        ? `Tải lên file xây dựng mẫu: ${file.name}${customFileName ? ` (Lưu: ${customFileName})` : ''}`
        : `Tải lên file bóc tách nội dung: ${file.name}`
    }]);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      if (!text.trim()) {
        throw new Error('Nội dung file Word trống hoặc không thể đọc được.');
      }

      if (uploadMode === 'template') {
        const response = await analyzeDocxForTemplate(text, customFileName);
        
        if (response.type === 'template') {
          setMessages(prev => [...prev, { 
            role: 'model', 
            content: response.content || 'Tôi đã phân tích thành công file mẫu của bạn.',
            type: 'template'
          }]);
          
          (window as any).__lastGeneratedTemplate = {
            ...response.template,
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      } else {
        const data = await extractDocxStructure(text);
        
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: 'Tôi đã bóc tách dữ liệu từ file Word theo định dạng văn bản hành chính. Bạn có muốn áp dụng vào form ngay không?',
          type: 'extraction',
          data: data
        }]);
      }
    } catch (error) {
      let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      if (error instanceof Error) {
        if (error.message.includes('API Key missing')) {
          errorMessage = 'Chưa cấu hình API Key. Vui lòng liên hệ quản trị viên.';
        } else if (error.message.includes('file Word trống')) {
          errorMessage = 'File Word bạn tải lên không có nội dung hoặc không thể đọc được. Hãy thử file khác.';
        } else {
          errorMessage = `Lỗi: ${error.message}`;
        }
      }
      setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
    } finally {
      setIsLoading(false);
      setShowUploadOption(false);
      setCustomFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 right-6 w-[calc(100vw-48px)] sm:w-[400px] bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-premium border border-white/50 flex flex-col overflow-hidden z-[60] h-[600px]"
    >
      <div className="bg-slate-900 p-6 flex items-center justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">AI Trợ lý Thiết kế</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <button 
            onClick={() => {
              setUploadMode('extraction');
              setShowUploadOption(!showUploadOption);
            }} 
            className={`p-2 rounded-xl transition-all ${showUploadOption && uploadMode === 'extraction' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}
            title="Bóc tách nội dung từ Word"
          >
            <FileType size={18} />
          </button>
          <button 
            onClick={() => {
              setUploadMode('template');
              setShowUploadOption(!showUploadOption);
            }} 
            className={`p-2 rounded-xl transition-all ${showUploadOption && uploadMode === 'template' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}
            title="Tải file Word mẫu"
          >
            <Upload size={18} />
          </button>
          <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white" title="Làm mới chat">
            <MessageSquare size={18} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar relative">
        <AnimatePresence>
          {showUploadOption && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-xl mb-6 relative z-20 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-12 -mt-12"></div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                {uploadMode === 'template' ? <Upload size={16} className="text-indigo-600" /> : <FileType size={16} className="text-indigo-600" />}
                {uploadMode === 'template' ? 'Dựng mẫu từ File Word' : 'Bóc tách văn bản Word'}
              </h4>
              <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                {uploadMode === 'template' 
                  ? 'AI sẽ phân tích cấu trúc, định dạng và các trường dữ liệu từ file DOCX của bạn để tạo mẫu mới.'
                  : 'AI sẽ tự động tìm kiếm và phân loại văn bản của bạn thành 3 phần: Mở đầu, Nội dung và Kết thúc.'}
              </p>
              
              <div className="space-y-4">
                {uploadMode === 'template' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên mẫu tùy chọn (không bắt buộc)</label>
                    <input 
                      type="text"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="VD: Mẫu hợp đồng kinh tế..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                )}
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".docx"
                  className="hidden"
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Upload size={14} />
                  CHỌN FILE ĐỂ TẢI LÊN
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[90%] p-4 rounded-[1.5rem] shadow-sm relative group ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-200' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm shadow-slate-100'
            }`}>
              {msg.role === 'model' && (
                <div className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Bot size={24} className="text-slate-300" />
                </div>
              )}
              <div className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</div>
              
              {msg.type === 'questions' && msg.questions && (
                <div className="mt-4 space-y-3 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">Câu hỏi cần giải đáp:</p>
                  <div className="space-y-2.5">
                    {msg.questions.map((q, i) => (
                      <div key={i} className="flex gap-2 text-indigo-600 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50 text-[11px] font-bold">
                        <span className="shrink-0">Q{i+1}:</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.type === 'template' && (
                <button 
                  onClick={handleSave}
                  className="mt-5 w-full py-3 bg-slate-900 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <ListChecks size={14} className="text-indigo-400" />
                  LƯU MẪU VÀO THƯ VIỆN
                </button>
              )}

              {msg.type === 'extraction' && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] space-y-2">
                    <p><strong>Cơ quan:</strong> {msg.data?.agencyName || 'Trống'}</p>
                    <p><strong>Số/Ký hiệu:</strong> {msg.data?.docNumber || 'Trống'}</p>
                    <p><strong>Trích yếu:</strong> {msg.data?.title || 'Trống'}</p>
                    <p><strong>Người ký:</strong> {msg.data?.signerName || 'Trống'}</p>
                  </div>
                  <button 
                    onClick={() => handleApplyData(msg.data)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                  >
                    <CheckCircle2 size={14} />
                    XÁC NHẬN ÁP DỤNG
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex gap-3 bg-slate-100 p-2 rounded-[1.5rem] shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all border border-slate-200">
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Yêu cầu AI tạo mẫu mới..."
            className="flex-1 px-4 py-2 bg-transparent rounded-xl focus:outline-none text-sm font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/30 active:scale-95 shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
