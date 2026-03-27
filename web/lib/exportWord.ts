"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

/* ─── 内联格式解析 ─── */
interface InlineSegment {
  text: string;
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
}

function parseInlineFormatting(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // 匹配: **bold**, *italic*, `code`, ***bold+italic***
  const regex = /(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // 前面的纯文本
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      // ***bold+italic***
      segments.push({ text: match[2], bold: true, italics: true });
    } else if (match[4]) {
      // **bold**
      segments.push({ text: match[4], bold: true });
    } else if (match[6]) {
      // *italic*
      segments.push({ text: match[6], italics: true });
    } else if (match[8]) {
      // `code`
      segments.push({ text: match[8], code: true });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

function segmentsToRuns(segments: InlineSegment[], baseFontSize: number = 24): TextRun[] {
  return segments.map(
    (seg) =>
      new TextRun({
        text: seg.text,
        bold: seg.bold,
        italics: seg.italics,
        font: seg.code ? "Consolas" : "仿宋",
        size: baseFontSize, // half-points
        color: seg.code ? "C23B22" : undefined,
      })
  );
}

/* ─── Markdown → Paragraph[] ─── */
function markdownToParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行 → 跳过
    if (line.trim() === "") {
      i++;
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
      };
      const fontSizes: Record<number, number> = { 1: 36, 2: 32, 3: 28, 4: 26 };
      const segments = parseInlineFormatting(text);
      paragraphs.push(
        new Paragraph({
          heading: headingMap[level] || HeadingLevel.HEADING_4,
          spacing: { before: 240, after: 120 },
          children: segments.map(
            (seg) =>
              new TextRun({
                text: seg.text,
                bold: true,
                font: "黑体",
                size: fontSizes[level] || 26,
                color: level <= 2 ? "C23B22" : "333333",
              })
          ),
        })
      );
      i++;
      continue;
    }

    // 水平分割线
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      paragraphs.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
          },
          spacing: { before: 120, after: 120 },
        })
      );
      i++;
      continue;
    }

    // 无序列表  - / * / •
    const ulMatch = line.match(/^(\s*)[-*•]\s+(.+)/);
    if (ulMatch) {
      const indent = Math.floor((ulMatch[1] || "").length / 2);
      const text = ulMatch[2];
      const segments = parseInlineFormatting(text);
      paragraphs.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          indent: { left: convertInchesToTwip(0.3 + indent * 0.25) },
          children: [
            new TextRun({ text: "•  ", font: "仿宋", size: 24 }),
            ...segmentsToRuns(segments),
          ],
        })
      );
      i++;
      continue;
    }

    // 有序列表  1. / 2.
    const olMatch = line.match(/^(\s*)(\d+)[.)]\s+(.+)/);
    if (olMatch) {
      const indent = Math.floor((olMatch[1] || "").length / 2);
      const num = olMatch[2];
      const text = olMatch[3];
      const segments = parseInlineFormatting(text);
      paragraphs.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          indent: { left: convertInchesToTwip(0.3 + indent * 0.25) },
          children: [
            new TextRun({ text: `${num}. `, font: "仿宋", size: 24, bold: true }),
            ...segmentsToRuns(segments),
          ],
        })
      );
      i++;
      continue;
    }

    // 引用 > （支持多行连续引用合并）
    const quoteMatch = line.match(/^>\s*(.*)/);
    if (quoteMatch) {
      // 收集连续引用行
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s*(.*)/.test(lines[i])) {
        const m = lines[i].match(/^>\s*(.*)/);
        quoteLines.push(m ? m[1] : "");
        i++;
      }
      const quoteText = quoteLines.join("\n");
      const segments = parseInlineFormatting(quoteText);
      paragraphs.push(
        new Paragraph({
          spacing: { before: 60, after: 60 },
          indent: { left: convertInchesToTwip(0.4) },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: "C23B22" },
          },
          children: segments.map(
            (seg) =>
              new TextRun({
                text: seg.text,
                bold: seg.bold,
                italics: true,
                font: "楷体",
                size: 24,
                color: "666666",
              })
          ),
        })
      );
      continue;
    }

    // 普通段落
    {
      const segments = parseInlineFormatting(line);
      paragraphs.push(
        new Paragraph({
          spacing: { before: 60, after: 60, line: 360 },
          alignment: AlignmentType.JUSTIFIED,
          children: segmentsToRuns(segments),
        })
      );
      i++;
    }
  }

  return paragraphs;
}

/* ─── 导出主函数 ─── */
export async function exportAnalysisToWord(
  markdown: string,
  filename: string = "案件分析报告"
) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "仿宋",
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        children: [
          // 标题
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "案件分析报告",
                bold: true,
                font: "黑体",
                size: 44,
                color: "C23B22",
              }),
            ],
          }),
          // 副标题 - 日期
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `法智 AI · ${dateStr}`,
                font: "楷体",
                size: 22,
                color: "999999",
              }),
            ],
          }),
          // 分割线
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "C23B22" },
            },
            spacing: { after: 300 },
          }),
          // 正文
          ...markdownToParagraphs(markdown),
          // 底部声明
          new Paragraph({
            spacing: { before: 600 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" },
            },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: "本报告由「法智」AI 智能法律服务平台生成，仅供参考。",
                font: "楷体",
                size: 18,
                color: "AAAAAA",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}
