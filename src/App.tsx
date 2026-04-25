import React, { useState, useRef } from 'react';
import { FileText, Download, Settings, CheckCircle2, Loader2, Eye, X, RotateCcw, Sparkles, Type, ChevronDown, Undo2, Redo2, Layout, Upload, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveAs } from 'file-saver';
import { GoogleGenAI } from "@google/genai";
import mammoth from 'mammoth';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface DocMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface DocFormData {
  nationalTitle: string;
  motto: string;
  agencyName: string;
  docNumber: string;
  locationDate: string;
  title: string;
  content: string;
  recipient: string;
  signerPosition: string;
  signerName: string;
  mode: 'standard' | 'custom';
  docType: 'standard' | 'regulation';
  margins: DocMargins;
  fontFamily: string;
  boldLevel: number;
}

const INITIAL_DATA: DocFormData = {
  nationalTitle: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
  motto: "Độc lập - Tự do - Hạnh phúc",
  agencyName: "TÊN CƠ QUAN CHỦ QUẢN",
  docNumber: "01/BC-UBND",
  locationDate: "Hà Nội, ngày 24 tháng 04 năm 2024",
  title: "BÁO CÁO KẾT QUẢ CÔNG TÁC THÁNG 04",
  content: "Căn cứ vào kế hoạch công tác năm 2024...\nChúng tôi xin báo cáo kết quả thực hiện như sau:\n1. Về tình hình triển khai dự án...\n2. Về công tác nhân sự...",
  recipient: "Ủy ban nhân dân thành phố\nSở Kế hoạch và Đầu tư\nLưu: Văn thư.",
  signerPosition: "CHỦ TỊCH",
  signerName: "NGUYỄN VĂN A",
  mode: 'standard',
  docType: 'standard',
  margins: { top: 2, bottom: 2, left: 3, right: 2 },
  fontFamily: "Times New Roman",
  boldLevel: 0
};

const TEMPLATES = [
  {
    id: 'quyet-dinh',
    title: 'Quyết định',
    description: 'Dùng cho việc ban hành quy chế, bổ nhiệm, phê duyệt...',
    data: {
      title: "QUYẾT ĐỊNH\nVề việc ban hành Quy chế chi tiêu nội bộ năm 2024",
      docNumber: "15/QĐ-UBND",
      content: "Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;\nCăn cứ Luật Ngân sách nhà nước năm 2015;\nXét đề nghị của Chánh Văn phòng và Trưởng phòng Tài chính - Kế hoạch,\n\nQUYẾT ĐỊNH:\n\nĐiều 1. Ban hành kèm theo Quyết định này Quy chế chi tiêu nội bộ năm 2024 áp dụng cho cơ quan...\nĐiều 2. Quyết định này có hiệu lực kể từ ngày ký.\nĐiều 3. Các đơn vị và cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này./.",
      signerPosition: "CHỦ TỊCH",
      signerName: "NGUYỄN VĂN A"
    }
  },
  {
    id: 'bao-cao',
    title: 'Báo cáo',
    description: 'Báo cáo tình hình thực hiện nhiệm vụ, kết quả công tác...',
    data: {
      title: "BÁO CÁO\nKết quả thực hiện nhiệm vụ công tác tháng 04/2024",
      docNumber: "22/BC-VP",
      content: "I. CÔNG TÁC TRỌNG TÂM ĐÃ THỰC HIỆN\n1. Về công tác tham mưu, tổng hợp...\n2. Về triển khai các dự án đầu tư công...\n3. Về cải cách hành chính và chuyển đổi số...\n\nII. ĐÁNH GIÁ CHUNG\nNhững ưu điểm đã đạt được và một số tồn tại, hạn chế cần khắc phục...\n\nIII. PHƯƠNG HƯỚNG NHIỆM VỤ THÁNG TỚI\nTiếp tục thúc đẩy tiến độ các dự án trọng điểm...",
      signerPosition: "VĂN PHÒNG",
      signerName: "TRẦN VĂN B"
    }
  },
  {
    id: 'cong-van',
    title: 'Công văn',
    description: 'Trao đổi công việc giữa các cơ quan, đơn vị...',
    data: {
      title: "V/v phối hợp tổ chức Hội nghị xúc tiến đầu tư năm 2024",
      docNumber: "128/CV-SKHĐT",
      content: "Kính gửi: Các cơ quan, đơn vị chuyên môn thành phố.\n\nThực hiện chỉ đạo của UBND Thành phố về việc tổ chức Hội nghị xúc tiến đầu tư năm 2024, Sở Kế hoạch và Đầu tư đề nghị quý đơn vị phối hợp các nội dung sau:\n\n1. Cung cấp danh mục các dự án kêu gọi đầu tư thuộc lĩnh vực quản lý.\n2. Cử cán bộ tham gia Tổ giúp việc chuẩn bị nội dung hội thảo.\n\nSở Kế hoạch và Đầu tư rất mong nhận được sự phối hợp của quý đơn vị./.",
      signerPosition: "GIÁM ĐỐC",
      signerName: "LÊ THỊ C"
    }
  },
  {
    id: 'to-trinh',
    title: 'Tờ trình',
    description: 'Trình cấp trên phê duyệt chủ trương, dự án, phương án...',
    data: {
      title: "TỜ TRÌNH\nVề việc phê duyệt chủ trương đầu tư dự án Xây dựng công viên A",
      docNumber: "45/TTr-BQL",
      content: "Kính gửi: Ủy ban nhân dân thành phố.\n\nCăn cứ Luật Đầu tư công năm 2019;\nCăn cứ quy hoạch phát triển đô thị đã được phê duyệt,\n\nBan Quản lý dự án kính trình UBND Thành phố phê duyệt chủ trương đầu tư dự án Xây dựng công viên A với các nội dung chính như sau:\n1. Tên dự án: Xây dựng công viên A.\n2. Mục tiêu đầu tư: Tạo không gian xanh, phục vụ nhu cầu vui chơi cho cư dân...\n3. Tổng mức đầu tư dự kiến: 50.000.000.000 đồng.\n\nKính trình UBND Thành phố xem xét, phê duyệt./.",
      signerPosition: "GIÁM ĐỐC",
      signerName: "LƯU VĂN D"
    }
  },
  {
    id: 'quy-che',
    title: 'Quy chế/Nội quy',
    description: 'Quy định nội bộ, nội quy cơ quan, quy chế chi tiêu...',
    data: {
      docType: 'regulation',
      title: "QUY CHẾ\nLàm việc của cơ quan và chế độ hội họp",
      docNumber: "02/QC-CQ",
      content: "Chương I\nQUY ĐỊNH CHUNG\n\nĐiều 1. Phạm vi điều chỉnh và đối tượng áp dụng\n1. Quy chế này quy định về thời gian làm việc, tác phong công sở...\n2. Đối tượng áp dụng là toàn thể cán bộ, công chức, viên chức...\n\nĐiều 2. Nguyên tắc làm việc\nLàm việc theo chế độ thủ trưởng, đề cao trách nhiệm cá nhân...\n\nChương II\nCHẾ ĐỘ LÀM VIỆC VÀ HỘI HỌP\n\nĐiều 3. Thời gian làm việc\nSáng từ 08h00 đến 12h00; Chiều từ 13h00 đến 17h00...",
      signerPosition: "THỦ TRƯỞNG ĐƠN VỊ",
      signerName: "NGUYỄN VĂN A"
    }
  }
];

const isHeading = (line: string, boldLevel: number) => {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Cải tiến nhận diện tiêu đề in hoa hoàn toàn
  const isAllCaps = trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  if (isAllCaps) return true;

  if (boldLevel === 0) return false;

  const romanPattern = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|PHẦN|CHƯƠNG|MỤC|TIỂU\s+MỤC|ĐIỀU)\.?\s/i;
  const arabicPattern = /^[0-9]+\.\s/;
  const letterPattern = /^[a-z]\)\s/;

  if (boldLevel >= 1 && romanPattern.test(trimmed)) return true;
  if (boldLevel >= 2 && arabicPattern.test(trimmed)) return true;
  if (boldLevel >= 3 && letterPattern.test(trimmed)) return true;

  return false;
};

export default function App() {
  const [formData, setFormData] = useState<DocFormData>(INITIAL_DATA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCheckingSpell, setIsCheckingSpell] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      if (text.trim()) {
        await parseDocumentWithAI(text);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Không thể đọc file Word này. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseDocumentWithAI = async (text: string) => {
    setIsGenerating(true);
    try {
      const prompt = `Phân tích văn bản hành chính sau và tách thành các trường dữ liệu JSON.
      Yêu cầu cực kỳ quan trọng:
      1. Trích xuất đầy đủ và trọn vẹn TOÀN BỘ phần nội dung chính của văn bản vào trường "content". KHÔNG ĐƯỢC TÓM TẮT, KHÔNG ĐƯỢC BỎ SÓT bất kỳ dòng nào trong phần nội dung.
      2. Các trường cần tìm: 
         - agencyName: Tên cơ quan ban hành.
         - docNumber: Số hiệu văn bản.
         - nationalTitle: Quốc hiệu (CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM).
         - motto: Tiêu ngữ (Độc lập - Tự do - Hạnh phúc).
         - locationDate: Địa danh, ngày tháng năm.
         - title: Tên loại văn bản và trích yếu nội dung.
         - content: TOÀN BỘ nội dung chi tiết (phải giữ nguyên các đoạn văn).
         - signerPosition: Chức vụ người ký.
         - signerName: Họ tên người ký.
      3. Nếu không tìm thấy trường cụ thể, hãy để trống "".
      4. Chỉ trả về JSON nguyên bản, không giải thích.

      Văn bản cần phân tích:
      ${text}`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const responseText = result.text;
      
      try {
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanedJson);
        pushToHistory(formData.content);
        setFormData(prev => ({
          ...prev,
          ...parsedData
        }));
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', responseText);
        // Fallback: If AI fails to return proper JSON, at least put all text in content
        pushToHistory(formData.content);
        setFormData(prev => ({ ...prev, content: text }));
      }
    } catch (error) {
      console.error('Error parsing with AI:', error);
      alert('Có lỗi khi xử lý văn bản bằng AI. Đang hiển thị văn bản thô.');
      setFormData(prev => ({ ...prev, content: text }));
    } finally {
      setIsGenerating(false);
    }
  };

  const loadTemplate = (template: typeof TEMPLATES[0]) => {
    pushToHistory(formData.content);
    setFormData(prev => ({
      ...prev,
      ...template.data
    }));
    setActiveTemplate(template.id);
  };

  const pushToHistory = (currentContent: string) => {
    setHistory(prev => [...prev, currentContent].slice(-50)); // Limit history to 50 steps
    setFuture([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setFuture(prev => [formData.content, ...prev]);
    setFormData(prev => ({ ...prev, content: previous }));
  };

  const redo = () => {
    if (future.length === 0) return;
    const [next, ...remainingFuture] = future;
    setFuture(remainingFuture);
    setHistory(prev => [...prev, formData.content]);
    setFormData(prev => ({ ...prev, content: next }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'content') {
      // For character typing, we could debounce history pushing, but for now we push on every significant change or just keep it simple
      // A common pattern is to only push to history on blur or after a pause
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const convertEncoding = async (from: 'tcvn3' | 'vni') => {
    if (!formData.content.trim()) return;
    
    pushToHistory(formData.content);
    setIsCleaning(true);
    try {
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Chuyển mã nội dung sau từ bảng mã ${from === 'tcvn3' ? 'TCVN3 (ABC)' : 'VNI-Windows'} sang Unicode.
        Đây là văn bản bị lỗi font chữ do sao chép từ tài liệu cũ.
        Yêu cầu:
        1. Phục hồi đúng tiếng Việt chuẩn Unicode.
        2. Chỉ trả về nội dung đã chuyển mã, không giải thích gì thêm.
        
        Nội dung lỗi font:
        "${formData.content}"`,
      });

      const convertedText = result.text;
      if (convertedText) {
        setFormData(prev => ({ ...prev, content: convertedText.trim() }));
      }
    } catch (error) {
      console.error('Error converting encoding:', error);
    } finally {
      setIsCleaning(false);
      setShowConvertMenu(false);
    }
  };

  const checkSpellWithAI = async () => {
    if (!formData.content.trim()) return;
    
    pushToHistory(formData.content);
    setIsCheckingSpell(true);
    try {
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Kiểm tra và sửa lỗi chính tả cho văn bản hành chính sau đây.
        Yêu cầu:
        1. Sửa lỗi chính tả, lỗi đánh máy, lỗi đặt dấu câu.
        2. Giữ nguyên cấu trúc câu và ý nghĩa.
        3. Chỉ trả về nội dung đã sửa, không giải thích.
        
        Nội dung:
        "${formData.content}"`,
      });

      const fixedText = result.text;
      if (fixedText) {
        setFormData(prev => ({ ...prev, content: fixedText.trim() }));
      }
    } catch (error) {
      console.error('Error checking spell:', error);
    } finally {
      setIsCheckingSpell(false);
    }
  };

  const convertCase = (type: 'upper' | 'lower' | 'sentence' | 'no-accent') => {
    pushToHistory(formData.content);
    let text = formData.content;
    if (type === 'upper') {
      text = text.toUpperCase();
    } else if (type === 'lower') {
      text = text.toLowerCase();
    } else if (type === 'sentence') {
      text = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      }).join('\n');
    } else if (type === 'no-accent') {
      text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    }
    setFormData(prev => ({ ...prev, content: text }));
    setShowConvertMenu(false);
  };

  const cleanContentWithAI = async () => {
    if (!formData.content.trim()) return;
    
    pushToHistory(formData.content);
    setIsCleaning(true);
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Bạn là một chuyên gia về soạn thảo văn bản hành chính Việt Nam. Hãy làm sạch và chuẩn hóa nội dung văn bản sau đây.
        
        Yêu cầu nghiêm ngặt:
        1. Loại bỏ khoảng trắng thừa, ký tự lạ, sửa lỗi chính tả.
        2. NHẬN DIỆN VÀ ĐỊNH DẠNG DANH SÁCH:
           - Các mục lớn phải đánh số thứ tự kèm dấu chấm (VD: 1., 2., 3.).
           - Các mục con bên trong phải đánh thứ tự chữ cái kèm dấu đóng ngoặc (VD: a), b), c)).
           - Đảm bảo tính logic và liên tục của các số thứ tự.
        3. CĂN CHỈNH VĂN PHONG: Sử dụng ngôn từ trang trọng, khách quan, đúng chuẩn Nghị định 78/2025/NĐ-CP.
        4. Trả về DUY NHẤT nội dung đã được xử lý, không giải thích, không thêm tiêu đề hay ký hiệu khác.

        Nội dung cần xử lý:
        "${formData.content}"`,
      });

      const cleanedText = response.text;
      if (cleanedText) {
        setFormData(prev => ({ ...prev, content: cleanedText.trim() }));
      }
    } catch (error) {
      console.error('Error cleaning content with AI:', error);
      alert('Không thể kết nối với AI để làm sạch văn bản. Vui lòng kiểm tra lại.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleMarginChange = (side: keyof DocMargins, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      margins: { ...prev.margins, [side]: numValue },
      mode: 'custom'
    }));
  };

  const setStandardMode = () => {
    setFormData(prev => ({
      ...prev,
      mode: 'standard',
      margins: { top: 2, bottom: 2, left: 3, right: 2 },
      fontFamily: "Times New Roman"
    }));
  };

  const generateWord = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Generation failed');

      const blob = await response.blob();
      saveAs(blob, 'vanban_hanhchinh.docx');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Có lỗi xảy ra khi tạo file Word. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const PreviewContent = ({ isModal = false }) => (
    <div 
      className={`${isModal ? 'w-full' : 'w-[600px] shadow-2xl'} h-fit min-h-[842px] bg-white flex flex-col shadow-slate-400/50 relative mx-auto transition-all duration-300`} 
      style={{ 
        fontFamily: formData.fontFamily,
        paddingTop: `${formData.margins.top * 28.35}pt`,
        paddingBottom: `${formData.margins.bottom * 28.35}pt`,
        paddingLeft: `${formData.margins.left * 28.35}pt`,
        paddingRight: `${formData.margins.right * 28.35}pt`,
      }}
    >
      {/* National Title Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="text-center w-[33%] flex flex-col items-center">
          <p className="text-[13px] uppercase font-bold leading-tight line-clamp-2">{formData.agencyName}</p>
          <p className="text-[13px] mt-1">Số: {formData.docNumber}</p>
          <div className="w-16 h-[0.5px] bg-black mt-2"></div>
        </div>
        {formData.docType !== 'regulation' && (
          <div className="text-center w-[67%] flex flex-col items-center">
            <p className="text-[13px] font-bold uppercase tracking-tight whitespace-nowrap">{formData.nationalTitle}</p>
            <p className="text-[14px] font-bold mt-1">{formData.motto}</p>
            <div className="w-40 h-[0.5px] bg-black mt-1"></div>
          </div>
        )}
      </div>

      {formData.docType !== 'regulation' && (
        <div className="text-right mb-6">
          <p className="text-[13px] italic">{formData.locationDate}</p>
        </div>
      )}

      {/* Document Title */}
      <div className="text-center mb-8">
        {formData.docType === 'regulation' ? (
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-[17px] font-bold uppercase leading-tight whitespace-pre-wrap">{formData.title}</h3>
            <div className="w-24 h-[1px] bg-black mt-2"></div>
          </div>
        ) : (
          <h3 className="text-[15px] font-bold uppercase leading-tight whitespace-pre-wrap">{formData.title}</h3>
        )}
      </div>

      {/* Main Body */}
      <div className="text-[14px] leading-relaxed text-justify mb-16 whitespace-pre-wrap">
        {formData.content.split('\n').map((line, i) => {
          const isLineHeading = isHeading(line, formData.boldLevel);
          return (
            <p 
              key={i} 
              className={`min-h-[1.5em] ${isLineHeading && formData.boldLevel > 0 ? 'font-bold' : ''}`}
              style={{ 
                textIndent: (line.trim() && !isLineHeading) ? '1.27cm' : '0',
                marginBottom: line.trim() ? '6pt' : '0',
                textAlign: (line.trim() === line.trim().toUpperCase() && line.trim().length > 3) ? 'center' : 'justify'
              }}
            >
              {line}
            </p>
          );
        })}
      </div>

      {/* Location Date for Regulation */}
      {formData.docType === 'regulation' && (
        <div className="flex justify-end mb-4">
          <div className="w-[50%] text-center">
            <p className="text-[13px] italic">{formData.locationDate}</p>
          </div>
        </div>
      )}

      {/* Footer / Signatures */}
      <div className="flex justify-between mt-auto">
        <div className="w-[45%]">
          <p className="text-[12px] font-bold italic underline mb-1">Nơi nhận:</p>
          <p className="text-[11px] leading-tight whitespace-pre-wrap">
            {formData.recipient.split('\n').map(line => `- ${line}`).join('\n')}
          </p>
        </div>
        <div className="w-[50%] text-center">
          <p className="text-[14px] font-bold uppercase">{formData.signerPosition}</p>
          <div className="h-28 flex items-center justify-center italic text-slate-300 text-[12px]">
            (Chỗ ký tên, đóng dấu)
          </div>
          <p className="text-[14px] font-bold uppercase">{formData.signerName}</p>
        </div>
      </div>

      {!isModal && (
        <div className="absolute top-4 right-4 text-[10px] text-slate-300 pointer-events-none uppercase tracking-widest font-sans">
          Bản xem trước A4
        </div>
      )}
    </div>
  );

  return (
    <div className={`w-full h-screen bg-[#f8fafc] text-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[1000]' : 'relative'}`}>
      {/* Header */}
      <header className={`bg-white border-b border-slate-200 flex justify-between items-center shrink-0 z-20 shadow-sm transition-all ${isFullscreen ? 'px-4 py-2' : 'px-4 md:px-8 py-4'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold shadow-md">
            <FileText size={20} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-900 leading-tight uppercase tracking-tight">Hệ thống Soạn thảo</h1>
            <p className="text-xs text-slate-500">Nghị định 78/2025/NĐ-CP</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".docx" 
            className="hidden" 
          />
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 md:px-4 md:py-2 rounded text-sm font-medium transition-all flex items-center gap-2 shadow-sm border ${
              isFullscreen 
              ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200' 
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
            title={isFullscreen ? "Đóng trình soạn thảo" : "Chỉnh sửa toàn màn hình"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            <span className="hidden sm:inline">{isFullscreen ? "Đóng trình chỉnh sửa" : "Chỉnh sửa toàn màn hình"}</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isGenerating}
            className="p-2 md:px-4 md:py-2 bg-white border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-600 shadow-sm"
            title="Tải file Word lên"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="hidden sm:inline">Tải File Lên</span>
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 md:px-4 md:py-2 bg-white border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-600"
            title="Cài đặt định dạng"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Cài đặt</span>
          </button>
          <button 
            onClick={() => setFormData(INITIAL_DATA)}
            className="p-2 md:px-4 md:py-2 bg-white border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-600"
            title="Làm lại"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Làm lại</span>
          </button>
          <button 
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-2 md:px-4 bg-slate-100 border border-slate-200 rounded text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2 text-slate-700"
            title="Xem trước toàn màn hình"
          >
            <Eye size={16} />
            <span>Xem trước</span>
          </button>
          <button 
            onClick={generateWord}
            disabled={isGenerating}
            className="px-3 py-2 md:px-5 bg-blue-600 text-white rounded text-sm font-semibold shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden xs:inline">Tải .docx</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Fullscreen Editor Overlay */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center overflow-hidden"
            >
              <div className="w-full max-w-5xl h-full flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Layout size={16} className="text-blue-600" />
                      TRÌNH CHỈNH SỬA TẬP TRUNG
                    </h2>
                    <div className="h-4 w-[1px] bg-slate-300"></div>
                    <p className="text-xs text-slate-500 italic">Mọi thay đổi sẽ được cập nhật tự động vào bản xem trước</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={undo}
                      disabled={history.length === 0}
                      className="p-2 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg text-slate-600 transition-all disabled:opacity-20 flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Undo2 size={14} /> Hoàn tác
                    </button>
                    <button 
                      onClick={redo}
                      disabled={future.length === 0}
                      className="p-2 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg text-slate-600 transition-all disabled:opacity-20 flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Redo2 size={14} /> Làm lại
                    </button>
                    <button 
                      onClick={() => setIsFullscreen(false)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-md shadow-blue-200"
                    >
                      <CheckCircle2 size={14} /> Hoàn tất
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-6 md:p-12 bg-[#fcfcfc] overflow-y-auto custom-scrollbar flex flex-col items-center">
                  <div className="w-full max-w-4xl bg-white shadow-xl min-h-full p-12 md:p-16 rounded-sm border border-slate-100 flex flex-col">
                    <textarea
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      placeholder="Bắt đầu nhập nội dung tại đây..."
                      className="w-full flex-1 text-[16px] leading-[1.8] text-slate-800 outline-none resize-none bg-transparent placeholder:text-slate-300 scrollbar-hide"
                      style={{ fontFamily: formData.fontFamily }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium px-6">
                  <div className="flex gap-6 uppercase tracking-wider">
                    <span>Font: {formData.fontFamily}</span>
                    <span>Bold Level: {formData.boldLevel}</span>
                    <span>Doc Type: {formData.docType === 'regulation' ? 'Quy chuẩn' : 'Hành chính'}</span>
                  </div>
                  <div>
                    Số từ: {formData.content.trim().split(/\s+/).filter(Boolean).length} | 
                    Số ký tự: {formData.content.length}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar - Editor */}
        <aside className="w-full lg:w-[420px] bg-white border-r border-slate-200 overflow-y-auto shrink-0 scroll-smooth shadow-inner z-10">
          {/* Template Library Section */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Layout size={14} className="text-slate-400" />
              Thư viện mẫu văn bản
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => loadTemplate(tpl)}
                  className={`flex-shrink-0 w-48 p-4 rounded-xl border text-left transition-all hover:shadow-md group ${
                    activeTemplate === tpl.id 
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                    : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <h3 className={`font-bold text-sm mb-1 ${activeTemplate === tpl.id ? 'text-blue-700' : 'text-slate-800'}`}>
                    {tpl.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-8">
            <section>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings size={14} />
                Thông tin chung
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Loại văn bản</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, docType: 'standard' }))}
                      className={`flex-1 py-2 text-xs font-medium rounded border transition-all ${
                        formData.docType === 'standard' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      Hành chính (CV, QĐ...)
                    </button>
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, docType: 'regulation' }))}
                      className={`flex-1 py-2 text-xs font-medium rounded border transition-all ${
                        formData.docType === 'regulation' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      Quy chuẩn (Nội quy, Quy chế...)
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Tên cơ quan ban hành</label>
                  <input 
                    name="agencyName"
                    value={formData.agencyName}
                    onChange={handleInputChange}
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Số văn bản</label>
                    <input 
                      name="docNumber"
                      value={formData.docNumber}
                      onChange={handleInputChange}
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Địa danh & Thời gian</label>
                    <input 
                      name="locationDate"
                      value={formData.locationDate}
                      onChange={handleInputChange}
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-6 border-t border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={14} />
                Nội dung chính
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Tiêu đề văn bản</label>
                  <input 
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nội dung chi tiết</label>
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50/80 p-1 rounded-lg border border-slate-100 shadow-sm">
                      {/* Undo/Redo Group */}
                      <div className="flex items-center bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                        <button 
                          onClick={undo}
                          disabled={history.length === 0}
                          className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-20 border-r border-slate-100"
                          title="Hoàn tác (Undo)"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button 
                          onClick={redo}
                          disabled={future.length === 0}
                          className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-20"
                          title="Làm lại (Redo)"
                        >
                          <Redo2 size={14} />
                        </button>
                      </div>

                      {/* Formatting Group */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <button
                            onClick={() => setShowConvertMenu(!showConvertMenu)}
                            className="h-8 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 px-2.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-all shadow-sm group"
                          >
                            <Type size={14} className="text-slate-400 group-hover:text-blue-500" />
                            <span>Chuyển mã</span>
                            <ChevronDown size={12} className={`text-slate-400 transition-transform ${showConvertMenu ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {showConvertMenu && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowConvertMenu(false)}></div>
                                <motion.div 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-44 z-40 overflow-hidden"
                                >
                                  <div className="px-3 py-1 mb-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Định dạng chữ</div>
                                  <button onClick={() => convertCase('upper')} className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 text-slate-700 font-medium transition-colors">IN HOA TẤT CẢ</button>
                                  <button onClick={() => convertCase('lower')} className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 text-slate-700 transition-colors">in thường tất cả</button>
                                  <button onClick={() => convertCase('sentence')} className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 text-slate-700 transition-colors">Viết hoa đầu dòng</button>
                                  <button onClick={() => convertCase('no-accent')} className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 text-slate-700 transition-colors">bo dau tieng viet</button>
                                  <div className="h-[1px] bg-slate-100 my-1.5"></div>
                                  <div className="px-3 py-1 mb-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Khắc phục lỗi</div>
                                  <button onClick={() => convertEncoding('tcvn3')} className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 text-blue-600 font-bold transition-colors">Fix lỗi font TCVN3</button>
                                  <button onClick={() => convertEncoding('vni')} className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 text-blue-600 font-bold transition-colors">Fix lỗi font VNI</button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                        <button
                          onClick={() => setFormData(prev => ({ ...prev, boldLevel: (prev.boldLevel + 1) % 4 }))}
                          className={`h-8 flex items-center gap-2 text-[11px] font-bold px-3 rounded-md border transition-all shadow-sm shrink-0 ${
                            formData.boldLevel > 0 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                          title={`Tô đậm tiêu đề (Mức ${formData.boldLevel}/3)`}
                        >
                          <Type size={14} className={formData.boldLevel > 0 ? 'font-bold' : ''} />
                          <span>Tiêu đề B {formData.boldLevel > 0 ? `(${formData.boldLevel})` : ''}</span>
                        </button>
                      </div>

                      {/* AI Utilities Group */}
                      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-1.5 ml-0.5">
                        <button
                          onClick={checkSpellWithAI}
                          disabled={isCheckingSpell || !formData.content.trim()}
                          className="h-8 flex items-center gap-2 text-[11px] font-bold text-emerald-700 px-3 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-all disabled:opacity-40 group shadow-sm shrink-0"
                        >
                          {isCheckingSpell ? (
                            <Loader2 size={14} className="animate-spin text-emerald-500" />
                          ) : (
                            <CheckCircle2 size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                          )}
                          <span>{isCheckingSpell ? 'Đang check...' : 'Sửa lỗi chính tả'}</span>
                        </button>

                        <button
                          onClick={cleanContentWithAI}
                          disabled={isCleaning || !formData.content.trim()}
                          className="h-8 flex items-center gap-2 text-[11px] font-bold text-blue-700 px-3 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-all disabled:opacity-40 group shadow-sm shrink-0"
                        >
                          {isCleaning ? (
                            <Loader2 size={14} className="animate-spin text-blue-500" />
                          ) : (
                            <Sparkles size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                          )}
                          <span>{isCleaning ? 'Đang xử lý...' : 'AI Tối ưu văn bản'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <textarea 
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    className="w-full h-48 lg:h-64 px-3 py-2 border border-slate-200 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all scroll-smooth"
                  />
                </div>
              </div>
            </section>

            <section className="pt-6 border-t border-slate-100 pb-8">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 size={14} />
                Ký duyệt & Nơi nhận
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Chức vụ người ký</label>
                  <input 
                    name="signerPosition"
                    value={formData.signerPosition}
                    onChange={handleInputChange}
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Họ tên người ký</label>
                  <input 
                    name="signerName"
                    value={formData.signerName}
                    onChange={handleInputChange}
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Nơi nhận</label>
                  <textarea 
                    name="recipient"
                    value={formData.recipient}
                    onChange={handleInputChange}
                    className="w-full h-24 px-3 py-2 border border-slate-200 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* Content - Live Preview (Hidden on small screens, shown as modal) */}
        <section className="hidden lg:flex flex-1 bg-slate-200 justify-center p-8 overflow-y-auto scroll-smooth">
          <PreviewContent />
        </section>
      </main>

      {/* Mobile Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 z-50 flex flex-col p-4 md:p-8 overflow-y-auto backdrop-blur-sm"
          >
            <div className="max-w-[700px] mx-auto w-full mb-4 flex justify-end">
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-medium pr-4"
              >
                <X size={24} />
                Đóng xem trước
              </button>
            </div>
            <div className="w-full max-w-[700px] mx-auto shadow-2xl rounded-lg overflow-hidden shrink-0">
               <PreviewContent isModal={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings size={18} />
                  Cấu hình văn bản
                </h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Chế độ định dạng</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={setStandardMode}
                      className={`px-3 py-4 rounded-lg border-2 transition-all text-left flex flex-col gap-1 ${formData.mode === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <span className="font-bold text-sm">Chuẩn Nghị định 30</span>
                      <span className="text-[10px] text-slate-500">Lề: 20-20-30-20 (mm)</span>
                    </button>
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, mode: 'custom' }))}
                      className={`px-3 py-4 rounded-lg border-2 transition-all text-left flex flex-col gap-1 ${formData.mode === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <span className="font-bold text-sm">Tùy chỉnh lề</span>
                      <span className="text-[10px] text-slate-500">Tự thiết lập thông số</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {formData.mode === 'custom' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4 pt-4 border-t border-slate-100"
                    >
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Phông chữ</label>
                        <select 
                          value={formData.fontFamily}
                          onChange={(e) => setFormData(prev => ({ ...prev, fontFamily: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Arial">Arial</option>
                          <option value="Calibri">Calibri</option>
                        </select>
                      </div>

                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Thông số lề (cm)</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Lề trên</label>
                          <input 
                            type="number" step="0.1"
                            value={formData.margins.top}
                            onChange={(e) => handleMarginChange('top', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Lề dưới</label>
                          <input 
                            type="number" step="0.1"
                            value={formData.margins.bottom}
                            onChange={(e) => handleMarginChange('bottom', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Lề trái</label>
                          <input 
                            type="number" step="0.1"
                            value={formData.margins.left}
                            onChange={(e) => handleMarginChange('left', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Lề phải</label>
                          <input 
                            type="number" step="0.1"
                            value={formData.margins.right}
                            onChange={(e) => handleMarginChange('right', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                >
                   Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-4 md:right-8 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-50 font-medium"
          >
            <CheckCircle2 size={24} />
            Đã tải file thành công!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

