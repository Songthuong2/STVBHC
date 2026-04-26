/// <reference types="vite/client" />
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Settings, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  X, 
  RotateCcw, 
  Sparkles, 
  Type as TypeIcon, 
  ChevronDown, 
  Undo2, 
  Redo2, 
  Wand2,
  Layout, 
  Upload, 
  Maximize, 
  Minimize, 
  Save, 
  History, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  AlignCenter,
  AlignLeft,
  Trash2,
  AlertCircle,
  Bot 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { GoogleGenAI } from "@google/genai";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  Timestamp,
  User
} from './lib/firebase';
import { AITemplateAssistant } from './components/AITemplateAssistant';

// Initialize Gemini AI (Lazy initialization)
let genAIInstance: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAIInstance) {
    // Ưu tiên lấy từ biến VITE_ như người dùng đã đặt trong ảnh
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình API Key. Vui lòng đặt biến VITE_GEMINI_API_KEY trong phần Settings.');
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
};

interface DocMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface DocTemplateField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'date';
}

interface DocTemplate {
  id?: string;
  userId: string;
  name: string;
  description: string;
  fields: DocTemplateField[];
  config: {
    fontFamily: string;
    margins: DocMargins;
    boldLevel: number;
    alignLevel: number;
    docType: 'standard' | 'regulation';
  };
  createdAt: any;
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
  alignLevel: number;
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
  boldLevel: 0,
  alignLevel: 0
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
  },
  {
    id: 'giay-moi',
    title: 'Giấy mời',
    description: 'Dùng để mời họp, tham dự hội nghị, sự kiện...',
    data: {
      title: "GIẤY MỜI\nTham dự Hội nghị sơ kết công tác 6 tháng đầu năm 2024",
      docNumber: "88/GM-UBND",
      content: "Ủy ban nhân dân thành phố trân trọng kính mời:\n....................................................................................................................................\n\nTới dự Hội nghị sơ kết công tác 6 tháng đầu năm và triển khai nhiệm vụ 6 tháng cuối năm 2024.\n\nThời gian: Vào hồi 08 giờ 30, ngày 15 tháng 7 năm 2024 (Thứ Hai).\nĐịa điểm: Hội trường tầng 3, Trụ sở UBND Thành phố.\nChủ trì: Lãnh đạo Ủy ban nhân dân thành phố.\n\nĐề nghị các đại biểu sắp xếp thời gian tham dự đầy đủ, đúng giờ để Hội nghị đạt kết quả tốt./.",
      signerPosition: "CHÁNH VĂN PHÒNG",
      signerName: "TRẦN VĂN E"
    }
  }
];

const SYSTEM_TEMPLATES: DocTemplate[] = [
  {
    userId: 'system',
    name: 'Giấy mời (Mẫu chuẩn)',
    description: 'Mẫu giấy mời họp chuyên nghiệp với đầy đủ các trường thông tin quy định.',
    fields: [
      { id: 'recipient', label: 'Kính mời', placeholder: 'Nhập tên đơn vị hoặc cá nhân được mời', type: 'text' },
      { id: 'event', label: 'Nội dung/Lý do', placeholder: 'VD: Hội nghị sơ kết công tác 6 tháng đầu năm...', type: 'textarea' },
      { id: 'time', label: 'Thời gian (Giờ)', placeholder: 'VD: 08 giờ 30', type: 'text' },
      { id: 'date', label: 'Ngày tháng', placeholder: '', type: 'date' },
      { id: 'location', label: 'Địa điểm', placeholder: 'VD: Hội trường A, Trụ sở UBND...', type: 'text' },
      { id: 'organizer', label: 'Cơ quan tổ chức', placeholder: 'VD: Văn phòng UBND Thành phố', type: 'text' }
    ],
    config: {
      fontFamily: "Times New Roman",
      margins: { top: 2, bottom: 2, left: 3, right: 2 },
      boldLevel: 2,
      alignLevel: 1,
      docType: 'standard'
    },
    createdAt: null
  }
];

const getHeadingLevel = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return 0;

  // All Caps is level 100
  const isAllCaps = trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  if (isAllCaps) return 100;

  const romanPattern = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|PHẦN|CHƯƠNG|MỤC|TIỂU\s+MỤC|ĐIỀU)\.?\s/i;
  const arabicPattern = /^[0-9]+\.\s/;
  const letterPattern = /^[a-z]\)\s/;

  if (romanPattern.test(trimmed)) return 1;
  if (arabicPattern.test(trimmed)) return 2;
  if (letterPattern.test(trimmed)) return 3;

  return 0;
};

const isHeading = (line: string, boldLevel: number) => {
  const level = getHeadingLevel(line);
  if (level === 100) return true;
  if (boldLevel === 0) return false;
  return level > 0 && level <= boldLevel;
};

export default function App() {
  const [formData, setFormData] = useState<DocFormData>(INITIAL_DATA);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCheckingSpell, setIsCheckingSpell] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restorePoint, setRestorePoint] = useState<string>('');
  const [majorRestorePoints, setMajorRestorePoints] = useState<{ content: string; label: string; timestamp: Date }[]>([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [savedDocuments, setSavedDocuments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isManagingTemplates, setIsManagingTemplates] = useState(false);
  const [isPreviewEditor, setIsPreviewEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const lastContentRef = useRef<string>(INITIAL_DATA.content);
  const isInternalChangeRef = useRef<boolean>(false);

  useEffect(() => {
    if (!restorePoint && formData.content.trim() && !isGenerating && !isCleaning && !isRewriting && !isCheckingSpell) {
      const timer = setTimeout(() => {
        if (!restorePoint && formData.content) {
          setRestorePoint(formData.content);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.content, restorePoint, isGenerating, isCleaning, isRewriting, isCheckingSpell]);

  // Auto history for typing/changes
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastContentRef.current = formData.content;
      return;
    }

    if (formData.content === lastContentRef.current) return;

    const timer = setTimeout(() => {
      const current = formData.content;
      const last = lastContentRef.current;
      
      if (current !== last) {
        setHistory(prev => {
          // Avoid pushing same state twice
          if (prev.length > 0 && prev[prev.length - 1] === last) return prev;
          return [...prev, last].slice(-100);
        });
        setFuture([]);
        lastContentRef.current = current;
      }
    }, 400); // 400ms debounce for better responsiveness

    return () => clearTimeout(timer);
  }, [formData.content]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input/textarea but handled by browser
      // However, since we manage state, we want our custom logic to prevail
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData.content, history, future]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user profile
        syncUserProfile(currentUser);
      } else {
        setSavedDocuments([]);
        setTemplates([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const qDocs = query(
        collection(db, 'documents'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubDocs = onSnapshot(qDocs, (snapshot) => {
        const docs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setSavedDocuments(docs);
      }, (error) => {
        console.error('Error fetching docs:', error);
      });

      const qTemplates = query(
        collection(db, 'templates'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubTemplates = onSnapshot(qTemplates, (snapshot) => {
        const teps = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as DocTemplate[];
        setTemplates(teps);
      }, (error) => {
        console.error('Error fetching templates:', error);
      });

      return () => {
        unsubDocs();
        unsubTemplates();
      };
    }
  }, [user]);

  const syncUserProfile = async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error syncing user profile:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        setErrorMessage('TRÌNH DUYỆT ĐÃ CHẶN CỬA SỔ ĐĂNG NHẬP\n\nĐể đăng nhập, vui lòng:\n1. Nhìn lên thanh địa chỉ của trình duyệt.\n2. Nhấn vào biểu tượng "Cửa sổ bị chặn" (thường có dấu X đỏ hoặc hình ổ khóa).\n3. Chọn "Always allow popups" (Luôn cho phép) cho trang web này.\n4. Tải lại trang và thử lại.');
      } else {
        setErrorMessage(`Đăng nhập thất bại: ${error.message || 'Lỗi không xác định'}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const saveDocument = async () => {
    if (!user) {
      handleLogin();
      return;
    }

    setIsSaving(true);
    try {
      const docData = {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'documents'), docData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedDocument = (savedDoc: any) => {
    const { id, userId, createdAt, updatedAt, ...rest } = savedDoc;
    setFormData(rest);
    setAsRestorePoint(rest.content || '', 'Mở từ lịch sử');
    setShowHistoryModal(false);
  };

  const deleteDocument = async (docId: string, e?: React.MouseEvent) => {
    // Stop propagation
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!docId) return;

    try {
      setIsDeleting(docId);
      const docReference = doc(db, 'documents', docId);
      await deleteDoc(docReference);
      
      setConfirmDeleteId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Firestore delete error:', error);
      handleFirestoreError(error, OperationType.DELETE, `documents/${docId}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const saveTemplate = async () => {
    if (!user) {
      handleLogin();
      return;
    }

    if (!editingTemplate?.name) {
      setErrorMessage('Vui lòng nhập tên mẫu trước khi lưu.');
      return;
    }

    try {
      const templateData = {
        ...editingTemplate,
        userId: user.uid,
        createdAt: editingTemplate.id ? editingTemplate.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingTemplate.id) {
        await updateDoc(doc(db, 'templates', editingTemplate.id), templateData);
      } else {
        await addDoc(collection(db, 'templates'), templateData);
      }
      
      setIsManagingTemplates(true);
      setEditingTemplate(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'templates');
    }
  };

  const deleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteTemplateId !== templateId) {
      setConfirmDeleteTemplateId(templateId);
      return;
    }

    try {
      await deleteDoc(doc(db, 'templates', templateId));
      setConfirmDeleteTemplateId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `templates/${templateId}`);
    }
  };

  const applyTemplate = (template: DocTemplate | any) => {
    // If it's a legacy template (TEMPLATES) or system template with 'data'
    if (template.data) {
      pushToHistory(formData.content);
      setFormData(prev => ({
        ...prev,
        ...template.data
      }));
      setAsRestorePoint(template.data.content || '', `Mẫu: ${template.data.name || 'AI'}`);
      setActiveTemplate(template.id);
      setShowTemplateModal(false);
      return;
    }

    // New template structure
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      ...template.config
    }));
    setAsRestorePoint(template.config.content || '', `Mẫu: ${template.name}`);
    
    // Initialize custom field values
    const initialValues: Record<string, string> = {};
    template.fields.forEach((f: any) => {
      initialValues[f.id] = '';
    });
    setCustomFieldValues(initialValues);
    
    setShowTemplateModal(false);
  };

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
      setErrorMessage('Không thể đọc file nội dung này. Vui lòng thử lại với file Word (.docx) hợp lệ.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const callAI = async (prompt: string, isJson: boolean = false) => {
    try {
      const ai = getGenAI();
      
      const config: any = {};
      if (isJson) {
        config.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config
      });

      if (!response.text) {
        throw new Error('AI không trả về nội dung');
      }

      return response.text;
    } catch (error: any) {
      console.error('AI Error:', error);
      const message = error.message || String(error);
      if (message.includes('API_KEY_INVALID')) {
        throw new Error('API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình.');
      }
      if (message.includes('quota')) {
        throw new Error('Hết hạn mức sử dụng AI (Quota exceeded). Thử lại sau.');
      }
      throw error;
    }
  };

  const parseDocumentWithAI = async (text: string) => {
    setIsGenerating(true);
    try {
      // Giới hạn độ dài văn bản để tránh lỗi token quá lớn (khoảng 15k ký tự)
      const truncatedText = text.length > 15000 ? text.substring(0, 15000) + "..." : text;

      const prompt = `Phân tích văn bản hành chính sau và tách thành các trường dữ liệu JSON.
      Yêu cầu cực kỳ quan trọng:
      1. Trích xuất đầy đủ và trọn vẹn TOÀN BỘ phần nội dung chính của văn bản vào trường "content". KHÔNG ĐƯỢC TÓM TẮT, KHÔNG ĐƯỢC BỎ SÓT bất kỳ dòng nào trong phần nội dung.
      2. Các trường cần tìm: 
         - agencyName: Tên cơ quan ban hành.
         - docNumber: Số hiệu văn bản.
         - nationalTitle: Quốc hiệu (CỘNG HÀA XÃ HỘI CHỦ NGHĨA VIỆT NAM).
         - motto: Tiêu ngữ (Độc lập - Tự do - Hạnh phúc).
         - locationDate: Địa danh, ngày tháng năm.
         - title: Tên loại văn bản và trích yếu nội dung.
         - content: TOÀN BỘ nội dung chi tiết (phải giữ nguyên các đoạn văn).
         - signerPosition: Chức vụ người ký.
         - signerName: Họ tên người ký.
      3. Nếu không tìm thấy trường cụ thể, hãy để trống "".
      4. Chỉ trả về JSON nguyên bản.

      Văn bản cần phân tích:
      ${truncatedText}`;

      const resultText = await callAI(prompt, true);
      
      try {
        const cleanedJson = resultText.replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanedJson);
        pushToHistory(formData.content);
        setFormData(prev => ({
          ...prev,
          ...parsedData
        }));
        setAsRestorePoint(parsedData.content || '', 'Nhập từ file/dán');
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', resultText);
        pushToHistory(formData.content);
        setFormData(prev => ({ ...prev, content: text }));
        setRestorePoint(text);
      }
    } catch (error: any) {
      console.error('Error parsing with AI:', error);
      setErrorMessage(`Có lỗi khi xử lý văn bản bằng AI: ${error.message || 'Lỗi không xác định'}. Đang hiển thị văn bản thô.`);
      setFormData(prev => ({ ...prev, content: text }));
      setRestorePoint(text);
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

  const pushToHistory = (contentToSave: string) => {
    setHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === contentToSave) return prev;
      return [...prev, contentToSave].slice(-100);
    });
    setFuture([]);
    lastContentRef.current = contentToSave;
    isInternalChangeRef.current = true;
  };

  const setAsRestorePoint = (content: string, label: string = 'Nội dung ban đầu') => {
    setRestorePoint(content);
    setMajorRestorePoints(prev => {
      // Don't add if the same content was the last point
      if (prev.length > 0 && prev[prev.length - 1].content === content) return prev;
      return [...prev, { content, label, timestamp: new Date() }].slice(-10); // Keep last 10
    });
  };

  const ensureRestorePoint = (label: string = 'Trước khi chỉnh sửa') => {
    if (formData.content.trim()) {
      setAsRestorePoint(formData.content, label);
    }
  };

  const undo = () => {
    const current = formData.content;
    const last = lastContentRef.current;

    // Case 1: Typing gap - if current content differs from last committed state
    if (current !== last) {
      setFuture(prev => [current, ...prev]);
      isInternalChangeRef.current = true;
      lastContentRef.current = last;
      setFormData(prev => ({ ...prev, content: last }));
      return;
    }

    // Case 2: Standard undo from history
    if (history.length === 0) return;
    
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setFuture(prev => [current, ...prev]);
    
    isInternalChangeRef.current = true;
    lastContentRef.current = previous;
    setFormData(prev => ({ ...prev, content: previous }));
  };

  const redo = () => {
    if (future.length === 0) return;
    const [next, ...remainingFuture] = future;
    
    // Push current to history before moving forward
    setHistory(prev => [...prev, formData.content].slice(-100));
    setFuture(remainingFuture);
    
    isInternalChangeRef.current = true;
    lastContentRef.current = next;
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
    
    ensureRestorePoint('Trước khi chuyển mã');
    pushToHistory(formData.content);
    setIsCleaning(true);
    try {
      const prompt = `Chuyển mã nội dung sau từ bảng mã ${from === 'tcvn3' ? 'TCVN3 (ABC)' : 'VNI-Windows'} sang Unicode.
        Đây là văn bản bị lỗi font chữ do sao chép từ tài liệu cũ.
        Yêu cầu:
        1. Phục hồi đúng tiếng Việt chuẩn Unicode.
        2. Chỉ trả về nội dung đã chuyển mã, không giải thích gì thêm.
        
        Nội dung lỗi font:
        "${formData.content}"`;

      const convertedText = await callAI(prompt);
      if (convertedText) {
        setFormData(prev => ({ ...prev, content: convertedText.trim() }));
      }
    } catch (error) {
      console.error('Error converting encoding:', error);
      setErrorMessage('Lỗi hệ thống chuyển mã. Vui lòng thử lại sau.');
    } finally {
      setIsCleaning(false);
      setShowConvertMenu(false);
    }
  };

  const checkSpellWithAI = async () => {
    if (!formData.content.trim()) return;
    
    ensureRestorePoint('Trước khi sửa chính tả');
    pushToHistory(formData.content);
    setIsCheckingSpell(true);
    try {
      const prompt = `Kiểm tra và sửa lỗi chính tả cho văn bản hành chính sau đây.
        Yêu cầu:
        1. Sửa lỗi chính tả, lỗi đánh máy, lỗi đặt dấu câu.
        2. Giữ nguyên cấu trúc câu và ý nghĩa.
        3. Chỉ trả về nội dung đã sửa, không giải thích.
        
        Nội dung:
        "${formData.content}"`;

      const fixedText = await callAI(prompt);
      if (fixedText) {
        setFormData(prev => ({ ...prev, content: fixedText.trim() }));
      }
    } catch (error) {
      console.error('Error checking spell:', error);
      setErrorMessage('Lỗi hệ thống kiểm tra chính tả. Vui lòng thử lại sau.');
    } finally {
      setIsCheckingSpell(false);
    }
  };

  const convertCase = (type: 'upper' | 'lower' | 'sentence' | 'no-accent') => {
    ensureRestorePoint('Trước khi đổi kiểu chữ');
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
    
    ensureRestorePoint('Trước khi AI Optimize');
    pushToHistory(formData.content);
    setIsCleaning(true);
    try {
      const prompt = `Bạn là một chuyên gia về soạn thảo văn bản hành chính Việt Nam. Hãy làm sạch và chuẩn hóa nội dung văn bản sau đây.
      
      Yêu cầu nghiêm ngặt:
      1. Loại bỏ khoảng trắng thừa, ký tự lạ, sửa lỗi chính tả.
      2. NHẬN DIỆN VÀ ĐỊNH DẠNG DANH SÁCH:
         - Các mục lớn phải đánh số thứ tự kèm dấu chấm (VD: 1., 2., 3.).
         - Các mục con bên trong phải đánh thứ tự chữ cái kèm dấu đóng ngoặc (VD: a), b), c)).
         - Đảm bảo tính logic và liên tục của các số thứ tự.
      3. CĂN CHỈNH VĂN PHONG: Sử dụng ngôn từ trang trọng, khách quan, đúng chuẩn Nghị định 78/2025/NĐ-CP.
      4. Trả về DUY NHẤT nội dung đã được xử lý, không giải thích, không thêm tiêu đề hay ký hiệu khác.

      Nội dung cần xử lý:
      "${formData.content}"`;

      const cleanedText = await callAI(prompt);
      if (cleanedText) {
        const finalContent = cleanedText.trim();
        setFormData(prev => ({ ...prev, content: finalContent }));
        setAsRestorePoint(finalContent, 'Sau AI Optimize');
      }
    } catch (error) {
      console.error('Error cleaning content with AI:', error);
      setErrorMessage('Không thể kết nối với dịch vụ AI để tối ưu văn bản. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsCleaning(false);
    }
  };

  const rewriteWithAI = async () => {
    if (!formData.content.trim()) return;
    
    ensureRestorePoint('Trước khi AI Viết lại');
    pushToHistory(formData.content);
    setIsRewriting(true);
    try {
      const docType = formData.title.split('\n')[0].trim() || 'Văn bản hành chính';
      const prompt = `Bạn là một chuyên gia soạn thảo văn bản hành chính Việt Nam chuyên nghiệp. 
      Hãy viết lại nội dung văn bản sau đây theo đúng lối văn và phong cách của loại văn bản: "${docType}".

      YÊU CẦU BẮT BUỘC:
      1. CHỈ viết lại phần nội dung chính (phần thân văn bản).
      2. LOẠI BỎ các thành phần sau nếu xuất hiện trong nội dung: Quốc hiệu, Tiêu ngữ, Tên đơn vị (phần Header), Số hiệu, Địa danh/Ngày tháng (đầu trang), Nơi nhận, và phần Ký tên của lãnh đạo.
      3. GIỮ NGUYÊN các thông tin mẫu hoặc biến số có sẵn trong văn bản gốc (ví dụ: [Tên đơn vị], [Địa danh], [Số lượng], ...). KHÔNG tự ý tạo thêm các biến số mới nếu gốc không có.
      4. Sử dụng ngôn ngữ hành chính chuẩn mực, trang trọng, chặt chẽ, đúng quy chuẩn pháp luật.
      5. Giữ nguyên các thông tin cốt lõi, số liệu và ý chính.
      6. Trả về DUY NHẤT nội dung đã được viết lại, không giải thích gì thêm.

      Nội dung gốc:
      "${formData.content}"`;

      const rewrittenText = await callAI(prompt);
      if (rewrittenText) {
        const finalContent = rewrittenText.trim();
        setFormData(prev => ({ ...prev, content: finalContent }));
        setAsRestorePoint(finalContent, 'Sau AI Viết lại');
      }
    } catch (error) {
      console.error('Error rewriting content with AI:', error);
      setErrorMessage('Không thể kết nối với dịch vụ AI để viết lại nội dung. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsRewriting(false);
    }
  };

  const applyFormatting = (tag: string, endTag?: string) => {
    if (!contentRef.current) return;
    
    const start = contentRef.current.selectionStart;
    const end = contentRef.current.selectionEnd;
    const text = formData.content;
    const selectedText = text.substring(start, end);
    
    if (start === end) return false; // No selection

    const actualEndTag = endTag || tag;
    
    let newContent;
    let newStart = start;
    let newEnd = end;

    // Cases for toggling off:
    // 1. Selection includes the tags: **text**
    const isWrappedSelection = selectedText.startsWith(tag) && selectedText.endsWith(actualEndTag);
    
    // 2. Selection is inside the tags: [tag]text[tag]
    const beforeSelection = text.substring(Math.max(0, start - tag.length), start);
    const afterSelection = text.substring(end, Math.min(text.length, end + actualEndTag.length));
    const isInsideTags = beforeSelection === tag && afterSelection === actualEndTag;

    if (isWrappedSelection) {
      pushToHistory(text);
      const unwrapped = selectedText.substring(tag.length, selectedText.length - actualEndTag.length);
      newContent = text.substring(0, start) + unwrapped + text.substring(end);
      newEnd = start + unwrapped.length;
    } else if (isInsideTags) {
      pushToHistory(text);
      newContent = text.substring(0, start - tag.length) + selectedText + text.substring(end + actualEndTag.length);
      newStart = start - tag.length;
      newEnd = end - tag.length;
    } else {
      pushToHistory(text);
      newContent = text.substring(0, start) + tag + selectedText + actualEndTag + text.substring(end);
      newStart = start + tag.length;
      newEnd = end + tag.length;
    }
    
    setFormData(prev => ({ ...prev, content: newContent }));
    
    // Reset focus and selection
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus();
        contentRef.current.setSelectionRange(newStart, newEnd);
      }
    }, 10);
    
    return true;
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

      if (!response.ok) {
        let errorMsg = 'Lỗi máy chủ khi tạo file';
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errData = await response.json();
            errorMsg = `${errData.error || errorMsg}\nChi tiết: ${errData.details || 'Không có'}`;
          } catch (e) {
            // Already handled
          }
        } else {
          // Vercel might return HTML error
          const text = await response.text();
          console.error('Non-JSON error response:', text.substring(0, 500));
          errorMsg = `Lỗi hệ thống Vercel (Status ${response.status}). Vui lòng kiểm tra Logs trên Vercel.`;
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('File tạo ra bị trống');
      
      saveAs(blob, `vanban_hanhchinh_${new Date().getTime()}.docx`);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating document:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo file xuất bản. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const PreviewContent = ({ isModal = false }) => (
    <div 
      className={`${isModal ? 'w-full' : 'paper-canvas w-[600px] shadow-[0_20px_50px_rgba(0,0,0,0.15)]'} h-fit min-h-[842px] bg-white relative mx-auto transition-all duration-300 group`} 
      style={{ 
        fontFamily: formData.fontFamily,
        paddingTop: `${formData.margins.top * 28.35}pt`,
        paddingBottom: `${formData.margins.bottom * 28.35}pt`,
        paddingLeft: `${formData.margins.left * 28.35}pt`,
        paddingRight: `${formData.margins.right * 28.35}pt`,
        color: '#000000'
      }}
    >
      {/* Decorative corners for premium look */}
      {!isModal && (
        <>
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-100/30 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-100/30 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-100/30 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-100/30 rounded-br-sm pointer-events-none" />
        </>
      )}

      {/* National Title Header */}
      <div className="flex justify-between items-start mb-8 relative z-10 text-black">
        <div className="text-center w-[33%] flex flex-col items-center">
          <p className="text-[12pt] uppercase font-bold leading-tight line-clamp-2">{formData.agencyName}</p>
          <p className="text-[12pt] mt-1">Số: {formData.docNumber}</p>
          <div className="w-16 h-[0.5px] bg-black mt-2"></div>
        </div>
        {formData.docType !== 'regulation' && (
          <div className="text-center w-[67%] flex flex-col items-center">
            <p className="text-[12pt] font-bold uppercase tracking-tight whitespace-nowrap">{formData.nationalTitle}</p>
            <p className="text-[13pt] font-bold mt-1">{formData.motto}</p>
            <div className="w-40 h-[0.5px] bg-black mt-1"></div>
          </div>
        )}
      </div>

      {formData.docType !== 'regulation' && (
        <div className="text-right mb-6 relative z-10 text-black">
          <p className="text-[13pt] italic">{formData.locationDate}</p>
        </div>
      )}

      {/* Document Title */}
      <div className="text-center mb-8 relative z-10 text-black">
        {formData.docType === 'regulation' ? (
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-[16pt] font-bold uppercase leading-tight whitespace-pre-wrap">{formData.title}</h3>
            <div className="w-24 h-[1px] bg-black mt-2"></div>
          </div>
        ) : (
          <h3 className="text-[14pt] font-bold uppercase leading-tight whitespace-pre-wrap">{formData.title}</h3>
        )}
      </div>

      <div className="text-[14pt] leading-relaxed text-justify mb-16 whitespace-pre-wrap relative z-10 text-black">
        {formData.content.split('\n').map((line, j) => {
          const isLineHeading = isHeading(line, formData.boldLevel);
          const headLevel = getHeadingLevel(line);
          const shouldCenter = (headLevel === 100) || (formData.alignLevel > 0 && headLevel > 0 && headLevel <= formData.alignLevel);

            // Recursive parser for selection-based tags to hide markers in preview
          const parseContent = (text: string): React.ReactNode => {
            if (!text) return "";
            
            // Refined regex for bold, font, and alignment. Using non-greedy and explicit escaping.
            const combinedRegex = /(\*{2}(.+?)\*{2})|(\[f:([^\]]+?)\](.+?)\[\/f\])|(\[a:([^\]]+?)\](.+?)\[\/a\])/g;
            const parts: (string | React.ReactNode)[] = [];
            let lastIdx = 0;
            let match;
            let partKey = 0;

            while ((match = combinedRegex.exec(text)) !== null) {
              if (match.index > lastIdx) {
                parts.push(text.substring(lastIdx, match.index));
              }

              if (match[1]) { // Bold: **text**
                parts.push(<strong key={`${j}-${partKey++}`}>{parseContent(match[2])}</strong>);
              } else if (match[3]) { // Font: [f:name]text[/f]
                parts.push(<span key={`${j}-${partKey++}`} style={{ fontFamily: match[4] }}>{parseContent(match[5])}</span>);
              } else if (match[6]) { // Align: [a:type]text[/a]
                parts.push(<span key={`${j}-${partKey++}`} className="inline-block" style={{ textAlign: match[7] as any }}>{parseContent(match[8])}</span>);
              }
              lastIdx = combinedRegex.lastIndex;
            }

            if (lastIdx < text.length) {
              parts.push(text.substring(lastIdx));
            }

            return parts.length > 0 ? <React.Fragment key={`line-${j}`}>{parts}</React.Fragment> : text;
          };

          return (
            <p 
              key={j} 
              className={`min-h-[1.5em] ${isLineHeading && formData.boldLevel > 0 ? 'font-bold' : ''}`}
              style={{ 
                textIndent: (line.trim() && !isLineHeading) ? '1.27cm' : '0',
                marginBottom: line.trim() ? '6pt' : '0',
                textAlign: shouldCenter ? 'center' : 'justify',
                color: '#000000'
              }}
            >
              {parseContent(line)}
            </p>
          );
        })}
      </div>

      {/* Footer / Signatures */}
      <div className="flex justify-between mt-auto relative z-10 text-black">
        <div className="w-[45%]">
          <p className="text-[11pt] font-bold italic underline mb-1">Nơi nhận:</p>
          <p className="text-[11pt] leading-tight whitespace-pre-wrap">
            {formData.recipient.split('\n').map(line => `- ${line}`).join('\n')}
          </p>
        </div>
        <div className="w-[50%] text-center">
          {formData.docType === 'regulation' && (
            <p className="text-[12pt] italic mb-2">{formData.locationDate}</p>
          )}
          <p className="text-[13pt] font-bold uppercase">{formData.signerPosition}</p>
          <div className="h-28 flex items-center justify-center italic text-slate-400 text-[11pt] border border-dashed border-slate-100 my-2 rounded-xl">
            (Ký tên, đóng dấu)
          </div>
          <p className="text-[13pt] font-bold uppercase">{formData.signerName}</p>
        </div>
      </div>

      {!isModal && (
        <div className="absolute bottom-4 right-4 text-[8px] text-slate-300 pointer-events-none uppercase tracking-[0.2em] font-sans opacity-0 group-hover:opacity-100 transition-opacity">
          Professional Document System v3.0
        </div>
      )}
    </div>
  );

  return (
    <div className={`w-full h-screen bg-[#F0F2F5] text-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[1000]' : 'relative'}`}>
      {/* Header */}
      <header className={`bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex justify-between items-center shrink-0 z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] transition-all ${isFullscreen ? 'px-4 py-2' : 'px-4 md:px-8 py-3'}`}>
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <FileText size={22} strokeWidth={2.5} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-extrabold text-slate-900 leading-tight tracking-tight font-display italic">STVBHC <span className="text-indigo-600">Pro</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Hệ thống Soạn thảo Thông minh</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Group 1: Templates & AI */}
          <div className="flex items-center bg-slate-100/50 p-1 rounded-xl gap-1 mr-2 border border-slate-200/50">
            <button 
              onClick={() => setShowTemplateModal(true)}
              className="px-3 py-1.5 hover:bg-white text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 border border-transparent hover:border-slate-200"
            >
              <Layout size={14} className="text-indigo-600" /> 
              <span className="hidden sm:inline">Thư viện mẫu</span>
            </button>
            <button 
              onClick={() => setShowAIAssistant(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 active:scale-95"
            >
              <Bot size={14} /> 
              <span className="hidden sm:inline">AI Trợ lý</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

          {/* Group 2: User Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={saveDocument}
                  disabled={isSaving}
                  className="hidden sm:flex px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100 items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Lưu Cloud
                </button>

                <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Xin chào,</span>
                  <span className="text-xs font-bold text-slate-700">{user.displayName}</span>
                </div>
                <div className="relative group">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md ring-1 ring-slate-100 cursor-pointer transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-full right-0 mt-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                    <div className="px-4 py-3 border-b border-slate-50 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">Đang kết nối</p>
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                    </div>
                    <button 
                      onClick={saveDocument}
                      disabled={isSaving}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
                    >
                      <Save size={16} /> Lưu văn bản lên Cloud
                    </button>
                    <button 
                      onClick={() => setShowHistoryModal(true)}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                    >
                      <History size={16} /> Văn bản đã lưu
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right mr-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lưu trữ trực tuyến</p>
                  <p className="text-[10px] font-medium text-slate-500 italic">Đăng nhập để lưu cloud</p>
                </div>
                <button 
                  onClick={handleLogin}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95"
                >
                  <UserIcon size={16} />
                  <span>Đăng nhập Google</span>
                </button>
              </div>
            )}

            <div className="h-8 w-[1px] bg-slate-200/60 mx-1"></div>

            <button 
              onClick={() => generateWord()}
              disabled={isGenerating}
              className="btn-primary bg-indigo-600"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="hidden sm:inline">Xuất File</span>
            </button>
          </div>
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
        <aside className="w-full lg:w-[420px] bg-white border-r border-slate-200 overflow-y-auto shrink-0 z-10 custom-scrollbar shadow-inner">
          <div className="p-5 border-b border-slate-100 bg-slate-50/30">
            <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Layout size={14} className="text-indigo-500" />
              Thư viện mẫu nhanh
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar-h">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => loadTemplate(tpl)}
                  className={`flex-shrink-0 w-44 p-4 rounded-2xl border text-left transition-all active:scale-95 group ${
                    activeTemplate === tpl.id 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-200' 
                    : 'border-slate-100 bg-white hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-2 rounded-lg mb-3 w-fit ${activeTemplate === tpl.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                    <FileText size={16} />
                  </div>
                  <h3 className={`font-bold text-xs mb-1 ${activeTemplate === tpl.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                    {tpl.title}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium leading-normal line-clamp-1">
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
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Cơ quan ban hành</label>
                  <input 
                    name="agencyName"
                    value={formData.agencyName}
                    onChange={handleInputChange}
                    type="text" 
                    className="input-standard" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số hiệu</label>
                    <input 
                      name="docNumber"
                      value={formData.docNumber}
                      onChange={handleInputChange}
                      type="text" 
                      className="input-standard font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Địa danh & Ngày tháng</label>
                    <input 
                      name="locationDate"
                      value={formData.locationDate}
                      onChange={handleInputChange}
                      type="text" 
                      className="input-standard italic" 
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-8 border-t border-slate-100">
              <h2 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                Nội dung chi tiết
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tiêu đề văn bản</label>
                  <textarea 
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    rows={2}
                    className="input-standard font-bold uppercase resize-none leading-relaxed" 
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-center bg-slate-900 rounded-xl p-1 shadow-lg shadow-slate-200">
                    <div className="flex items-center gap-2 py-0.5">
                      <button
                        onClick={checkSpellWithAI}
                        disabled={isCheckingSpell}
                        className="p-1 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                      >
                        {isCheckingSpell ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        CHÍNH TẢ
                      </button>
                      <button
                        onClick={rewriteWithAI}
                        disabled={isRewriting}
                        className="p-1 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                      >
                        {isRewriting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        AI REWRITE
                      </button>
                      <button
                        onClick={cleanContentWithAI}
                        disabled={isCleaning}
                        className="p-1 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {isCleaning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        AI OPTIMIZE
                      </button>
                      <button
                        onClick={() => {
                          if (majorRestorePoints.length === 0) {
                            if (formData.content.trim()) {
                              setAsRestorePoint(formData.content, 'Nội dung bắt đầu');
                              setErrorMessage("Điểm khôi phục đầu tiên đã được tạo. Bạn có thể khôi phục về trạng thái này sau khi chỉnh sửa.");
                            } else {
                              setErrorMessage("Chưa có lịch sử nội dung để khôi phục.");
                            }
                            return;
                          }
                          setShowRestoreModal(true);
                        }}
                        className="p-1 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                        title="Xem lịch sử khôi phục"
                      >
                        <RotateCcw size={12} />
                        KHÔI PHỤC
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={12} className="text-indigo-500" />
                       Nội dung văn bản
                    </h3>
                    
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                      <div className="relative">
                        <button
                          onClick={() => {
                            const hasSelection = contentRef.current && contentRef.current.selectionStart !== contentRef.current.selectionEnd;
                            if (hasSelection) {
                              const fonts = ['Arial', 'Roboto', 'Courier New', 'Georgia'];
                              const text = formData.content;
                              const start = contentRef.current!.selectionStart;
                              const end = contentRef.current!.selectionEnd;
                              const selectedText = text.substring(start, end);
                              
                              // Check if selection is already wrapped in a font tag [f:Name]...[/f]
                              const fontMatch = selectedText.match(/^\[f:([^\]]*)\](.*)\[\/f\]$/s);
                              const internalText = fontMatch ? fontMatch[2] : selectedText;
                              const currentLocalFont = fontMatch ? fontMatch[1] : "";
                              
                              let nextFont = "";
                              if (!fontMatch || currentLocalFont === "") {
                                nextFont = fonts[0]; // Start with Arial
                              } else {
                                const currentIndex = fonts.indexOf(currentLocalFont);
                                if (currentIndex === -1 || currentIndex === fonts.length - 1) {
                                  nextFont = ""; // Return to default
                                } else {
                                  nextFont = fonts[currentIndex + 1];
                                }
                              }

                              pushToHistory(text);
                              let newContent;
                              if (nextFont === "") {
                                newContent = text.substring(0, start) + internalText + text.substring(end);
                              } else {
                                const newTag = `[f:${nextFont}]`;
                                newContent = text.substring(0, start) + newTag + internalText + "[/f]" + text.substring(end);
                              }
                              
                              setFormData(prev => ({ ...prev, content: newContent }));
                              
                              // Reset focus and selection
                              setTimeout(() => {
                                if (contentRef.current) {
                                  contentRef.current.focus();
                                  if (nextFont === "") {
                                    contentRef.current.setSelectionRange(start, start + internalText.length);
                                  } else {
                                    const tagOffset = `[f:${nextFont}]`.length;
                                    contentRef.current.setSelectionRange(start, start + tagOffset + internalText.length + 4);
                                  }
                                }
                              }, 10);
                            } else {
                              setShowConvertMenu(!showConvertMenu);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all group"
                          title="Định dạng font"
                        >
                          <span className="text-sm font-bold w-4 h-4 flex items-center justify-center">F</span>
                        </button>
                        <AnimatePresence>
                          {showConvertMenu && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setShowConvertMenu(false)}></div>
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 w-48 z-40 overflow-hidden"
                              >
                                <div className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50">Phông chữ hệ thống</div>
                                {['Arial', 'Roboto', 'Courier New', 'Georgia'].map(font => (
                                  <button 
                                    key={font}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, fontFamily: font }));
                                      setShowConvertMenu(false);
                                    }} 
                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 ${formData.fontFamily === font ? 'text-indigo-600 font-bold' : 'text-slate-700 font-medium'}`}
                                    style={{ fontFamily: font }}
                                  >
                                    {font}
                                  </button>
                                ))}
                                <button 
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, fontFamily: "Times New Roman" }));
                                    setShowConvertMenu(false);
                                  }} 
                                  className={`w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 ${formData.fontFamily === "Times New Roman" ? 'text-indigo-600 font-bold' : 'text-slate-700 font-medium'}`}
                                  style={{ fontFamily: "Times New Roman" }}
                                >
                                  Mặc định (Times New Roman)
                                </button>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <div className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50">Công cụ chuyển đổi</div>
                                <button onClick={() => { convertCase('upper'); setShowConvertMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 text-slate-700 font-bold">IN HOA</button>
                                <button onClick={() => { convertCase('sentence'); setShowConvertMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 text-slate-700 font-medium">Viết hoa đầu dòng</button>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button onClick={() => { convertEncoding('tcvn3'); setShowConvertMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600 font-bold">Sửa lỗi TCVN3</button>
                                <button onClick={() => { convertEncoding('vni'); setShowConvertMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600 font-bold">Sửa lỗi VNI</button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <button
                        onClick={() => {
                          const applied = applyFormatting('**');
                          if (!applied) {
                            setFormData(prev => ({ ...prev, boldLevel: (prev.boldLevel + 1) % 4 }));
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-all ${formData.boldLevel > 0 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}
                        title="Tô đậm"
                      >
                        <span className="text-sm font-black w-4 h-4 flex items-center justify-center">B</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          const applied = applyFormatting('[a:center]', '[/a]');
                          if (!applied) {
                            setFormData(prev => ({ ...prev, alignLevel: (prev.alignLevel + 1) % 4 }));
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-all ${formData.alignLevel > 0 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}
                        title="Căn lề"
                      >
                        <AlignCenter size={16} />
                      </button>
                      
                      <button
                        onClick={() => setShowPreviewModal(true)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                        title="Xem trước"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5"></div>
                      
                      <button
                        onClick={undo}
                        disabled={!(history.length > 0 || formData.content !== lastContentRef.current)}
                        className={`p-1.5 rounded-lg transition-all ${history.length > 0 || formData.content !== lastContentRef.current ? 'text-slate-500 hover:text-slate-700 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`}
                        title="Hoàn tác (Ctrl+Z)"
                      >
                        <Undo2 size={16} />
                      </button>
                      
                      <button
                        onClick={redo}
                        disabled={future.length === 0}
                        className={`p-1.5 rounded-lg transition-all ${future.length > 0 ? 'text-slate-500 hover:text-slate-700 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`}
                        title="Làm lại (Ctrl+Y)"
                      >
                        <Redo2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    {/* Background Highlight Layer */}
                    <div 
                      className="absolute inset-0 px-4 py-4 border border-transparent rounded-3xl text-sm leading-relaxed whitespace-pre-wrap text-justify overflow-hidden pointer-events-none select-none bg-white font-sans opacity-40"
                      aria-hidden="true"
                    >
                      {formData.content.split('\n').map((line, i) => {
                        const isLineHeading = isHeading(line, formData.boldLevel);
                        const headLevel = getHeadingLevel(line);
                        const shouldCenter = (headLevel === 100) || (formData.alignLevel > 0 && headLevel > 0 && headLevel <= formData.alignLevel);
                        
                        return (
                          <div 
                            key={i} 
                            className={`min-h-[1.5rem] mb-0.5 transition-all duration-300 ${isLineHeading ? 'bg-indigo-100/50 border-l-4 border-indigo-500 -mx-2 px-2' : ''} ${shouldCenter ? 'text-center' : ''}`}
                          >
                            {line || '\u00A0'}
                          </div>
                        );
                      })}
                    </div>

                    <textarea 
                      name="content"
                      ref={contentRef}
                      value={formData.content}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
                        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
                      }}
                      placeholder="Nhập nội dung văn bản tại đây..."
                      className="relative z-10 w-full h-80 lg:h-96 px-4 py-4 border border-slate-200/50 rounded-3xl text-sm leading-relaxed focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all scroll-smooth bg-transparent text-slate-800 font-sans backdrop-blur-[1px]"
                    />
                    
                    {formData.boldLevel > 0 && (
                      <div className="absolute bottom-4 right-4 pointer-events-none z-20">
                        <motion.span 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="px-2 py-1 bg-indigo-600 text-white text-[9px] font-bold rounded-lg shadow-lg"
                        >
                          LIVE HIGHLIGHT ACTIVE
                        </motion.span>
                      </div>
                    )}
                  </div>

                  {/* Header Hint Section (Below Editor) */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                       <Layout size={12} className="text-indigo-500" />
                       Tóm tắt tiêu đề & định dạng ({formData.boldLevel > 0 ? "Đang áp dụng tô đậm" : "Chưa tô đậm"})
                    </h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                       {formData.content.split('\n').filter(l => getHeadingLevel(l) > 0).length > 0 ? (
                         formData.content.split('\n').map((line, i) => {
                           const level = getHeadingLevel(line);
                           const isApplied = isHeading(line, formData.boldLevel);
                           if (level === 0) return null;
                           
                           return (
                             <div key={i} className="flex items-center gap-3 group/item">
                               <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isApplied ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                 {level === 100 ? 'CAPS' : `L${level}`}
                               </span>
                               <span className={`text-xs truncate ${isApplied ? 'font-bold text-slate-800' : 'text-slate-400 italic'}`}>
                                 {line}
                               </span>
                             </div>
                           );
                         })
                       ) : (
                         <p className="text-[10px] italic text-slate-400">Chưa phát hiện tiêu đề nào trong nội dung (Sử dụng I., 1., a)...</p>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-3">
              <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-600/30 transition-colors"></div>
              <h2 className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
                <CheckCircle2 size={14} />
                Ký duyệt & Nơi nhận
              </h2>
              <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Chức vụ</label>
                    <input 
                      name="signerPosition"
                      value={formData.signerPosition}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Họ tên</label>
                    <input 
                      name="signerName"
                      value={formData.signerName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Nơi nhận</label>
                  <textarea 
                    name="recipient"
                    value={formData.recipient}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
            
            <div className="h-20"></div> {/* Bottom spacing */}
          </div>
        </aside>

        {/* Content - Live Preview */}
        <section className="hidden lg:flex flex-1 bg-[#E2E8F0] justify-center p-10 overflow-y-auto scroll-smooth custom-scrollbar relative perspective-1000">
          <div className="fixed top-24 right-10 z-40 flex flex-col gap-3">
             <button onClick={() => setIsFullscreen(true)} className="p-3 bg-white hover:bg-indigo-600 hover:text-white text-slate-600 rounded-2xl shadow-xl transition-all active:scale-95 border border-slate-200">
               <Maximize size={20} />
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white hover:bg-emerald-600 hover:text-white text-slate-600 rounded-2xl shadow-xl transition-all active:scale-95 border border-slate-200">
               <Upload size={20} />
             </button>
             <button onClick={() => setShowSettingsModal(true)} className="p-3 bg-white hover:bg-amber-500 hover:text-white text-slate-600 rounded-2xl shadow-xl transition-all active:scale-95 border border-slate-200">
               <Settings size={20} />
             </button>
          </div>
          <div className="transform transition-transform hover:scale-[1.01] duration-500">
            <PreviewContent />
          </div>
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

      <AnimatePresence>
        {showTemplateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Layout size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Mẫu văn bản tùy chỉnh</h2>
                    <p className="text-xs text-slate-500 font-medium">Tạo và quản lý các biểu mẫu hành chính định sẵn</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAIAssistant(true)}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                  >
                    <Bot size={14} /> AI Trợ lý
                  </button>
                  {!isManagingTemplates && (
                    <button 
                      onClick={() => {
                        setEditingTemplate({
                          userId: user?.uid || '',
                          name: '',
                          description: '',
                          fields: [{ id: Math.random().toString(36).substr(2, 9), label: 'Trường mới', placeholder: '', type: 'text' }],
                          config: { ...formData },
                          createdAt: null
                        });
                        setIsManagingTemplates(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Sparkles size={14} /> Thêm mẫu mới
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      setIsManagingTemplates(false);
                      setEditingTemplate(null);
                    }}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200 shadow-sm"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-[#fdfdfd]">
                {isManagingTemplates && editingTemplate ? (
                  <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên mẫu</label>
                        <input 
                          value={editingTemplate.name}
                          onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="VD: Báo cáo tuần, Quyết định khen thưởng..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mô tả</label>
                        <input 
                          value={editingTemplate.description}
                          onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Mô tả mục đích của mẫu này"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Danh sách các trường nhập liệu</h3>
                        <button 
                          onClick={() => {
                            const newFields = [...editingTemplate.fields, { id: Math.random().toString(36).substr(2, 9), label: 'Trường mới', placeholder: '', type: 'text' as any }];
                            setEditingTemplate({...editingTemplate, fields: newFields});
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-all uppercase tracking-widest"
                        >
                          + Thêm trường
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {editingTemplate.fields.map((field, idx) => (
                          <div key={field.id} className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <input 
                              value={field.label}
                              onChange={(e) => {
                                const newFields = [...editingTemplate.fields];
                                newFields[idx].label = e.target.value;
                                setEditingTemplate({...editingTemplate, fields: newFields});
                              }}
                              className="flex-1 min-w-[120px] text-xs font-bold border-b border-transparent focus:border-blue-300 outline-none py-1"
                              placeholder="Nhãn trường"
                            />
                            <select 
                              value={field.type}
                              onChange={(e) => {
                                const newFields = [...editingTemplate.fields];
                                newFields[idx].type = e.target.value as any;
                                setEditingTemplate({...editingTemplate, fields: newFields});
                              }}
                              className="text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="text">Dòng đơn</option>
                              <option value="textarea">Đoạn văn</option>
                              <option value="date">Ngày tháng</option>
                            </select>
                            <button 
                              onClick={() => {
                                const newFields = editingTemplate.fields.filter((_, i) => i !== idx);
                                setEditingTemplate({...editingTemplate, fields: newFields});
                              }}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsManagingTemplates(false)}
                        className="flex-1 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        Hủy bỏ
                      </button>
                      <button 
                        onClick={saveTemplate}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                      >
                        Lưu mẫu văn bản
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...SYSTEM_TEMPLATES, ...templates].map((template, tIdx) => (
                      <div 
                        key={template.id || `system-${tIdx}`}
                        className="group bg-white border border-slate-200 rounded-3xl p-5 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer relative flex flex-col"
                        onClick={() => applyTemplate(template)}
                      >
                         <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${template.userId === 'system' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            <Layout size={20} />
                          </div>
                          {template.userId !== 'system' && (
                            <div className="flex gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTemplate(template);
                                  setIsManagingTemplates(true);
                                }}
                                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Settings size={14} />
                              </button>
                               <button 
                                onClick={(e) => deleteTemplate(template.id!, e)}
                                onMouseLeave={() => confirmDeleteTemplateId === template.id && setConfirmDeleteTemplateId(null)}
                                className={`p-2 rounded-lg transition-all ${confirmDeleteTemplateId === template.id ? 'bg-red-500 text-white opacity-100 scale-110 shadow-lg animate-pulse' : 'text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'}`}
                                title={confirmDeleteTemplateId === template.id ? "Xác nhận xóa mẫu này?" : "Xóa mẫu"}
                              >
                                {confirmDeleteTemplateId === template.id ? <span className="text-[10px] font-bold px-1">XÓA?</span> : <Trash2 size={14} />}
                              </button>
                            </div>
                          )}
                          {template.userId === 'system' && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase tracking-tighter">Hệ thống</span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{template.name}</h3>
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                          {template.description || 'Không có mô tả'}
                        </p>
                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {template.fields.length} trường dữ liệu
                          </span>
                          <span className={`${template.userId === 'system' ? 'text-amber-500' : 'text-blue-500'} text-[10px] font-bold uppercase flex items-center gap-1`}>
                            Sử dụng ngay <Sparkles size={10} />
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => {
                        setEditingTemplate({
                          userId: user?.uid || '',
                          name: '',
                          description: '',
                          fields: [{ id: Math.random().toString(36).substr(2, 9), label: 'Tiêu đề', placeholder: '', type: 'text' }],
                          config: { ...formData },
                          createdAt: null
                        });
                        setIsManagingTemplates(true);
                      }}
                      className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-slate-400 hover:text-blue-500 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-white group-hover:border-blue-100 transition-all">
                        <Sparkles size={24} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">Tạo mẫu mới</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sáng tạo không giới hạn với Mẫu văn bản</p>
                {selectedTemplate && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Đang dùng mẫu: {selectedTemplate.name}</span>
                    <button 
                      onClick={() => setSelectedTemplate(null)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Văn bản đã lưu</h2>
                    <p className="text-xs text-slate-500 font-medium">Danh sách các văn bản bạn đã lưu trên hệ thống cloud</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-[#fdfdfd]">
                {savedDocuments.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <div className="p-6 bg-slate-50 rounded-full">
                      <FileText size={48} className="opacity-20" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-500">Chưa có văn bản nào được lưu</p>
                      <p className="text-xs">Hãy nhấn nút "Lưu Cloud" để lưu trữ văn bản của bạn</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedDocuments.map((docItem) => (
                      <div 
                        key={docItem.id}
                        className="group bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all relative flex flex-col h-full shadow-sm"
                      >
                        {/* Action Area - Separate from main click */}
                        <div className="absolute top-4 right-4 z-50">
                          <AnimatePresence mode="wait">
                            {confirmDeleteId === docItem.id ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                                className="flex items-center gap-1 bg-white border-2 border-red-500 rounded-2xl p-1 shadow-xl shadow-red-100"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1.5 text-[9px] font-bold text-slate-500 hover:bg-slate-50 rounded-xl uppercase"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDocument(docItem.id, e);
                                  }}
                                  disabled={isDeleting === docItem.id}
                                  className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-bold rounded-xl hover:bg-red-600 transition-colors uppercase flex items-center gap-1 shadow-sm shadow-red-200"
                                >
                                  {isDeleting === docItem.id ? <Loader2 size={10} className="animate-spin" /> : null}
                                  Xóa
                                </button>
                              </motion.div>
                            ) : (
                              <motion.button 
                                layoutId={`delete-btn-${docItem.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                type="button"
                                onClickCapture={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setConfirmDeleteId(docItem.id);
                                }}
                                className="p-3 rounded-2xl transition-all shadow-lg border-2 pointer-events-auto text-red-500 bg-red-50/90 backdrop-blur-sm hover:bg-red-500 hover:text-white border-red-100 hover:border-red-500 active:scale-90"
                                title="Xóa văn bản này"
                              >
                                <Trash2 size={18} />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Clickable Area to Load Document */}
                        <div 
                          onClick={() => loadSavedDocument(docItem)}
                          className="flex-1 p-6 cursor-pointer z-10"
                        >
                           <div className="flex items-start mb-4">
                             <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all group-hover:scale-110">
                               <FileText size={24} />
                             </div>
                           </div>
                           <h3 className="font-bold text-slate-800 text-base mb-2 group-hover:text-emerald-700 transition-colors pr-12 line-clamp-2 leading-snug">{docItem.title}</h3>
                           <p className="text-xs text-slate-500 mb-6 line-clamp-2 leading-relaxed opacity-70 italic">
                             {docItem.content.substring(0, 100)}...
                           </p>
                           <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Cập nhật</span>
                               <span className="text-xs font-bold text-slate-600">
                                 {docItem.createdAt?.toDate ? docItem.createdAt.toDate().toLocaleDateString('vi-VN') : 'Mới đây'}
                               </span>
                             </div>
                             <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-emerald-100">
                               {docItem.docType === 'regulation' ? 'Quy chuẩn' : 'Hành chính'}
                             </span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dữ liệu được bảo mật bởi Google Firebase</p>
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
            className="fixed top-20 right-4 md:right-8 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-50 font-medium"
          >
            <CheckCircle2 size={24} />
            Thao tác thành công!
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAIAssistant && user && (
          <AITemplateAssistant 
            userId={user.uid}
            onClose={() => setShowAIAssistant(false)}
            onApplyDocData={(data) => {
              pushToHistory(formData.content);
              setFormData(prev => ({
                ...prev,
                ...data
              }));
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
            }}
            onSaveTemplate={async (template) => {
              try {
                await addDoc(collection(db, 'templates'), {
                  ...template,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
              } catch (error) {
                console.error("Error saving AI template:", error);
                setErrorMessage("Lỗi khi lưu mẫu AI. Vui lòng thử lại sau.");
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRestoreModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative border border-slate-100 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Lịch sử nội dung</h3>
                    <p className="text-xs text-slate-500">Chọn một phiên bản để khôi phục</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRestoreModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {majorRestorePoints.slice().reverse().map((point, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      pushToHistory(formData.content);
                      setFormData(prev => ({ ...prev, content: point.content }));
                      setShowRestoreModal(false);
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 2000);
                    }}
                    className="w-full text-left p-4 rounded-2xl border-2 border-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          {point.label}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {point.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 italic">
                        "{point.content.substring(0, 100)}..."
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setShowRestoreModal(false)}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-red-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-4">Thông báo</h3>
              <p className="text-slate-600 text-center mb-8 whitespace-pre-wrap leading-relaxed">{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
              >
                Đã hiểu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

