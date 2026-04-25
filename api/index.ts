import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Increase payload limit for larger documents/AI requests
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper for cm to twips conversion (1 cm = 567 twips)
const cmToTwips = (cm: number) => Math.round(cm * 567);

const getHeadingLevel = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return 0;

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
  if (!boldLevel || boldLevel === 0) return false;
  return level > 0 && level <= boldLevel;
};

app.post('/api/generate-docx', async (req, res) => {
  try {
    const {
      nationalTitle = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      motto = "Độc lập - Tự do - Hạnh phúc",
      agencyName = "",
      docNumber = "",
      locationDate = "",
      title = "",
      content = "",
      recipient = "",
      signerPosition = "",
      signerName = "",
      docType = 'standard',
      margins = { top: 2, bottom: 2, left: 3, right: 2 },
      fontFamily = "Times New Roman",
      boldLevel = 0,
      alignLevel = 0
    } = req.body;

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: cmToTwips(margins.top),
              bottom: cmToTwips(margins.bottom),
              left: cmToTwips(margins.left),
              right: cmToTwips(margins.right),
            },
          },
        },
        children: [
          // Header Section: Agency name, Doc Number vs National Title, Motto
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                   new TableCell({
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: agencyName.toUpperCase(), bold: true, font: fontFamily, size: 26 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `Số: ${docNumber}`, font: fontFamily, size: 26 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "────────", bold: true, font: fontFamily, size: 24 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 67, type: WidthType.PERCENTAGE },
                    children: docType === 'regulation' ? [] : [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: nationalTitle.toUpperCase(), bold: true, font: fontFamily, size: 26 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: motto, bold: true, font: fontFamily, size: 26 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0 },
                        children: [
                          new TextRun({ text: "────────────────", bold: true, font: fontFamily, size: 26 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 240 } }), // Padding
          
          // Location and Date (Conditional for standard)
          ...(docType !== 'regulation' ? [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: locationDate, font: fontFamily, size: 28, italics: true }),
              ],
            })
          ] : []),

          new Paragraph({ spacing: { before: 400 } }),

          // Document Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ 
                text: title.toUpperCase(), 
                bold: true, 
                font: fontFamily, 
                size: docType === 'regulation' ? 34 : 32 
              }),
            ],
          }),

          ...(docType === 'regulation' ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "───────", bold: true, font: fontFamily, size: 24 }),
              ],
            })
          ] : []),

          new Paragraph({ spacing: { before: 400 } }),

          // Main Content
          ...content.split('\n').map((line: string) => {
            const isLineHeading = isHeading(line, boldLevel);
            const headLevel = getHeadingLevel(line);
            const shouldCenter = (headLevel === 100) || (alignLevel > 0 && headLevel > 0 && headLevel <= alignLevel);
            
            return new Paragraph({
              alignment: shouldCenter ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
              indent: (line.trim() && !isLineHeading) ? { firstLine: cmToTwips(1.27) } : undefined,
              spacing: { 
                line: 360, 
                before: 120, 
                after: 120 
              },
              children: [
                new TextRun({ 
                  text: line, 
                  font: fontFamily, 
                  size: 28,
                  bold: isLineHeading && boldLevel > 0
                }),
              ],
            });
          }),

          // Bottom section: Recipient and Signer
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                   new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Nơi nhận:", bold: true, font: fontFamily, size: 24, italics: true }),
                        ],
                      }),
                      ...recipient.split('\n').map((r: string) => 
                        new Paragraph({
                          children: [
                            new TextRun({ text: `- ${r}`, font: fontFamily, size: 22 }),
                          ],
                        })
                      ),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      ...(docType === 'regulation' ? [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: locationDate, font: fontFamily, size: 28, italics: true }),
                          ],
                        }),
                        new Paragraph({ spacing: { before: 120 } }), // Tight spacing
                      ] : []),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: signerPosition.toUpperCase(), bold: true, font: fontFamily, size: 28 }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 1000 } }), // Space for signature
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: signerName, bold: true, font: fontFamily, size: 28 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=vanban_hanhchinh.docx');
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);

  } catch (error) {
    console.error('Docx generation error:', error);
    res.status(500).json({ error: 'Failed to generate document: ' + (error as Error).message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
  });
} else if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  // Static serving for local production test
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// For local/non-serverless environments
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
