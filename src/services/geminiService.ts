import { GoogleGenAI } from "@google/genai";

// Schema for the template generation response
const responseSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          placeholder: { type: "string" },
          type: { type: "string", enum: ["text", "textarea", "date"] }
        },
        required: ["id", "label", "placeholder", "type"]
      }
    },
    config: {
      type: "object",
      properties: {
        fontFamily: { type: "string" },
        docType: { type: "string", enum: ["standard", "regulation"] },
        boldLevel: { type: "number" },
        alignLevel: { type: "number" },
        margins: {
          type: "object",
          properties: {
            top: { type: "number" },
            bottom: { type: "number" },
            left: { type: "number" },
            right: { type: "number" }
          }
        }
      }
    }
  },
  required: ["name", "description", "fields", "config"]
};

export interface AIResponse {
  type: 'message' | 'template' | 'questions';
  content: string;
  template?: any;
  questions?: string[];
}

export async function generateTemplatePrompt(description: string, chatHistory: any[] = []): Promise<AIResponse> {
  const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  if (!apiKey) throw new Error('API Key missing. Vui lòng cấu hình GEMINI_API_KEY.');

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    Bạn là một chuyên gia soạn thảo văn bản hành chính Việt Nam theo Nghị định 30/2020/NĐ-CP.
    Nhiệm vụ của bạn là hỗ trợ người dùng xây dựng "Mẫu văn bản" (Template) tùy chỉnh.

    QUY TRÌNH LÀM VIỆC:
    1. Giai đoạn Tìm hiểu (Type: "questions"): 
       - Khi người dùng đưa ra yêu cầu chung chung (ví dụ: "tạo mẫu hợp đồng"), đừng vội tạo mẫu ngay.
       - Hãy đặt câu hỏi để làm rõ:
         + Cấu trúc các trường thông tin cần nhập (ví dụ: Tên khách hàng, Số tiền, Thời hạn...).
         + Loại văn bản (Hành chính thông thường hay Văn bản quy phạm pháp luật).
         + Các thiết lập mặc định (Font chữ, lề, mức độ in đậm tiêu đề).
       - Mỗi lần đặt từ 2-4 câu hỏi cụ thể, ngắn gọn.

    2. Giai đoạn Đề xuất (Type: "template"):
       - Chỉ khi đã nắm rõ cấu trúc hoặc người dùng yêu cầu "tạo ngay", bạn mới sinh ra JSON template.
       - Giải thích ngắn gọn về các trường bạn đã thiết lập.

    3. Giai đoạn Trao đổi (Type: "message"):
       - Dùng cho các phản hồi chào hỏi hoặc giải thích thông thường.

    Định dạng JSON trả về PHẢI LUÔN LÀ:
    {
      "type": "message" | "questions" | "template",
      "content": "Lời nhắn của AI (Tiếng Việt)",
      "template": { ... schema bên dưới ... },
      "questions": ["Câu hỏi 1", "Câu hỏi 2"]
    }

    SCHEMA CỦA TEMPLATE:
    {
      "name": "Tên mẫu văn bản",
      "description": "Mô tả ngắn gọn công dụng",
      "fields": [
        { "id": "field_unique_id", "label": "Nhãn hiển thị", "placeholder": "Gợi ý nhập liệu", "type": "text" | "textarea" | "date" }
      ],
      "config": {
        "fontFamily": "Times New Roman" | "Arial",
        "docType": "standard" | "regulation",
        "boldLevel": 1 | 2 | 3,
        "alignLevel": 1 | 2 | 3,
        "margins": { "top": 2, "bottom": 2, "left": 3, "right": 2 }
      }
    }

    Luôn giữ thái độ chuyên nghiệp, am hiểu luật hành chính Việt Nam.
  `;

  const contents = [...chatHistory.map(m => ({
    role: m.role,
    parts: [{ text: m.parts[0]?.text || m.content }]
  })), {
    role: 'user',
    parts: [{ text: description }]
  }];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}') as AIResponse;
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
}

export async function analyzeDocxForTemplate(extractedText: string, customName?: string): Promise<AIResponse> {
  const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  if (!apiKey) throw new Error('API Key missing. Vui lòng cấu hình GEMINI_API_KEY.');

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    Bạn là một chuyên gia phân tích văn bản hành chính Việt Nam.
    Nhiệm vụ của bạn là nhận vào nội dung văn bản trích xuất từ file Word và phân tích cấu trúc của nó để tạo thành một "Mẫu văn bản" (Template) có thể tái sử dụng.

    YÊU CẦU PHÂN TÍCH:
    1. Xác định các thành phần biến đổi trong văn bản (ví dụ: Tên công ty, Ngày tháng, Số hiệu, Tên người ký, Nội dung chính).
    2. Tạo danh sách các "fields" với nhãn (label) và kiểu dữ liệu (type) phù hợp.
    3. Trích xuất cấu hình định dạng (font chữ nếu có thể đoán, loại văn bản, căn lề).
    4. Nếu người dùng cung cấp "customName", hãy sử dụng nó làm tên mẫu.

    Định dạng JSON trả về PHẢI LUÔN LÀ:
    {
      "type": "template",
      "content": "Tôi đã phân tích thành công file Word của bạn. Dưới đây là cấu trúc mẫu tôi đề xuất dựa trên văn bản đó.",
      "template": {
        "name": "Tên mẫu (từ customName hoặc tự đoán)",
        "description": "Mô tả mẫu dựa trên nội dung",
        "fields": [
          { "id": "field_id", "label": "Nhãn", "placeholder": "Gợi ý", "type": "text" | "textarea" | "date" }
        ],
        "config": {
          "fontFamily": "Times New Roman",
          "docType": "standard",
          "boldLevel": 1,
          "alignLevel": 1,
          "margins": { "top": 2, "bottom": 2, "left": 3, "right": 2 }
        }
      }
    }

    Cố gắng tạo ra các trường (fields) thông minh để người dùng có thể điền thông tin vào mẫu một cách dễ dàng nhất.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Hãy phân tích văn bản sau và tạo mẫu template. ${customName ? `Tên mẫu là: ${customName}` : ''}\n\nNỘI DUNG VĂN BẢN:\n${extractedText}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}') as AIResponse;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}

export async function extractDocxStructure(extractedText: string): Promise<any> {
  const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  if (!apiKey) throw new Error('API Key missing. Vui lòng cấu hình GEMINI_API_KEY.');

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    Bạn là một chuyên gia bóc tách văn bản hành chính Việt Nam theo Nghị định 30/2020/NĐ-CP.
    Nhiệm vụ của bạn là nhận vào nội dung văn bản và chia nó thành các phần chính xác để đưa vào form nhập liệu.

    HÃY TRÍCH XUẤT CÁC THÔNG TIN SAU:
    1. Phần mở đầu:
       - agencyName: Tên cơ quan, tổ chức ban hành (VD: UBND TỈNH LÀO CAI).
       - docNumber: Số, ký hiệu văn bản (VD: 123/BC-UBND).
       - nationalTitle: Quốc hiệu (VD: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM).
       - motto: Tiêu ngữ (VD: Độc lập - Tự do - Hạnh phúc).
       - locationDate: Địa danh và ngày tháng năm (VD: Lào Cai, ngày 20 tháng 10 năm 2024).
       - title: Tên loại và trích yếu nội dung (VD: BÁO CÁO Kết quả thực hiện nhiệm vụ).

    2. Phần nội dung:
       - content: Toàn bộ nội dung chính của văn bản (từ phần căn cứ đến hết phần nội dung).

    3. Phần kết thúc:
       - signerPosition: Chức vụ người ký (VD: CHỦ TỊCH).
       - signerName: Họ tên người ký.
       - recipients: Nơi nhận (liệt kê các đơn vị).

    YÊU CẦU:
    - Nếu không tìm thấy thông tin nào, hãy để chuỗi rỗng "".
    - Trả về định dạng JSON chính xác.

    ĐỊNH DẠNG JSON TRẢ VỀ:
    {
      "agencyName": "...",
      "docNumber": "...",
      "nationalTitle": "...",
      "motto": "...",
      "locationDate": "...",
      "title": "...",
      "content": "...",
      "signerPosition": "...",
      "signerName": "...",
      "recipients": "..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Hãy bóc tách văn bản hành chính sau đây:\n\n${extractedText}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Extraction Error:", error);
    throw error;
  }
}

export async function checkSpellWithAI(content: string): Promise<string> {
  const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  if (!apiKey) throw new Error('API Key missing.');

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy kiểm tra và sửa lỗi chính tả cho đoạn văn bản hành chính sau đây. Chỉ trả về đoạn văn bản đã được sửa, không thêm giải thích: \n\n${content}`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Spellcheck Error:", error);
    return content;
  }
}

export async function cleanContentWithAI(content: string): Promise<string> {
  const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  if (!apiKey) throw new Error('API Key missing.');

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy tối ưu hóa câu văn trong đoạn văn bản hành chính sau để trở nên chuyên nghiệp, súc tích và trang trọng hơn. Giữ nguyên ý nghĩa gốc. Chỉ trả về văn bản kết quả: \n\n${content}`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Clean Content Error:", error);
    return content;
  }
}
