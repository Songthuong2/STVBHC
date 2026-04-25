import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Helper for cm to twips conversion (1 cm = 567 twips)
const cmToTwips = (cm: number) => Math.round(cm * 567);

const isHeading = (line: string, boldLevel: number) => {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Nhận diện dòng in hoa (thường là tiêu đề trung tâm hoặc tiêu đề lớn)
  const isAllCaps = trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  if (isAllCaps) return true;

  if (!boldLevel || boldLevel === 0) return false;

  const romanPattern = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|PHẦN|CHƯƠNG|MỤC|TIỂU\s+MỤC|ĐIỀU)\.?\s/i;
  const arabicPattern = /^[0-9]+\.\s/;
  const letterPattern = /^[a-z]\)\s/;

  if (boldLevel >= 1 && romanPattern.test(trimmed)) return true;
  if (boldLevel >= 2 && arabicPattern.test(trimmed)) return true;
  if (boldLevel >= 3 && letterPattern.test(trimmed)) return true;

  return false;
};

app.post('/api/generate-docx', async (req, res) => {
  try {
    const {
      nationalTitle,
      motto,
      agencyName,
      docNumber,
      locationDate,
      title,
      content,
      recipient,
      signerPosition,
      signerName,
      docType = 'standard',
      margins = { top: 2, bottom: 2, left: 3, right: 2 },
      fontFamily = "Times New Roman",
      boldLevel = 0
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
            const isAllCaps = line.trim().length > 3 && line.trim() === line.trim().toUpperCase() && /[A-Z]/.test(line);
            
            return new Paragraph({
              alignment: isAllCaps ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
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

          // Location for Regulation (Conditional)
          ...(docType === 'regulation' ? [
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
                    new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [] }),
                    new TableCell({ 
                      width: { size: 50, type: WidthType.PERCENTAGE }, 
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: locationDate, font: fontFamily, size: 28, italics: true }),
                          ],
                        })
                      ] 
                    }),
                  ],
                })
              ]
            })
          ] : []),

          new Paragraph({ spacing: { before: 600 } }),

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
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  // API routes are handled above
  app.get('*', (req, res, next) => {
    // If it's an API route, don't serve index.html
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Low-level Vite middleware for development
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
