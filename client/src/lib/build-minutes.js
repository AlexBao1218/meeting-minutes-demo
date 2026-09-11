/**
 * 安全委員會會議記錄 · 瀏覽器端生成模組
 * =========================================
 * 用 JSZip + xmldom 直接操作 .docx 的 XML，樣式零重定義：所有段落與表格
 * 格式都從母版的「donor rows」複製，只換文字。原版在 Node.js FaaS 執行，
 * 公開 demo 把同一份邏輯搬到瀏覽器，母版由 /template.docx 取得。
 *
 * 用法：
 *   import { generate } from './build-minutes';
 *   const template = await fetch('/template.docx').then((r) => r.arrayBuffer());
 *   const { content, filename } = await generate(jsonString, template);
 *   // content  : Blob，即 .docx 檔案內容
 *   // filename : string，建議檔名
 *
 * item 若含 safety_table 欄位，會在該段正文之後插入安全表現統計表：
 *   "safety_table": { "rows": [
 *     { "dept": "部門 A", "accidents": "0", "rate": "0", "target": "0", "meet": "符合" }
 *   ] }
 * 表格標題列與千人意外率公式註解沿用母版；rows 可任意筆數；
 * 沒有 safety_table 欄位時行為與舊版完全相同。
 */

import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// ── 配置區 ─────────────────────────────────────────────────────
// 七個固定大節。順序與標題即最終文件的骨架，改這裡即可。
const SECTIONS = [
  ['（一）', '通過上次議程項目'],
  ['（二）', '跟進事項'],
  ['（三）', '安全表現'],
  ['（四）', '警惕性工業意外個案分享'],
  ['（五）', '工具箱專題'],
  ['（六）', '其他事項'],
  ['（七）', '下次會議日期及時間'],
];

// 某節沒有內容時的預設文字
const EMPTY_TEXT = {
  '通過上次議程項目': '上次會議記錄沒有更改事項及通過。',
  '跟進事項': '沒有跟進事項。',
};
const DEFAULT_EMPTY = '是次會議沒有相關事項。';

// 安全表現統計表的五個直欄，對應 JSON 欄位名
const STATS_FIELDS = ['dept', 'accidents', 'rate', 'target', 'meet'];

// 第一頁要清空的欄位（保留出席名單）
const BLANK_META_FIELDS = ['日期', '時間', '地點/方式'];
const BLANK_PLACEHOLDER = '＿＿＿＿＿＿＿＿＿＿';
const TITLE_PLACEHOLDER = '＿＿＿年第＿＿＿次會議記錄';

const OUTPUT_FILENAME = '安全委員會_2026_第X次_會議記錄.docx';

// 母版中的格式來源列（依既有會議記錄的結構，勿隨意更動）
const DONOR_HEADING_ROW = 15;  // 節標題列：[節號][標題][空]
const DONOR_SPACER_ROW = 16;   // 空白間隔列
const DONOR_CONTENT_ROW = 23;  // 內容列：[空][內容][行動]
const DONOR_STYLE_ROW = 28;    // 取小標題與項目符號段落格式
const ACTION_HEADER_ROW = 7;   // 取「行動」欄名的格式
const STATS_HOST_ROW = 18;     // 安全表現統計表所在列（外層 1x1 表格）

// ── DOM 小工具（一律用「直接子節點」，因為母版儲存格內有巢狀表格）──
function childrenByTag(node, tag) {
  const out = [];
  for (let n = node.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && n.nodeName === tag) out.push(n);
  }
  return out;
}

function rowsOf(tbl) { return childrenByTag(tbl, 'w:tr'); }
function cellsOf(tr) { return childrenByTag(tr, 'w:tc'); }
function parasOf(tc) { return childrenByTag(tc, 'w:p'); }

/** 深度優先找第一個後代 w:tbl（不含自身）。 */
function firstDescendantTbl(node) {
  for (let n = node.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) continue;
    if (n.nodeName === 'w:tbl') return n;
    const found = firstDescendantTbl(n);
    if (found) return found;
  }
  return null;
}

function textOf(node) {
  const ts = node.getElementsByTagName('w:t');
  let s = '';
  for (let i = 0; i < ts.length; i++) s += ts[i].textContent;
  return s;
}

/** 把段落內容換成 text，沿用第一個 run 的所有格式，刪除其餘 run。 */
function setParaText(p, text) {
  const runs = childrenByTag(p, 'w:r');
  if (!runs.length) return p;

  const first = runs[0];
  const ts = first.getElementsByTagName('w:t');
  if (ts.length) {
    ts[0].textContent = text;
    // 保留空白字元不被 Word 吃掉
    ts[0].setAttribute('xml:space', 'preserve');
    for (let i = ts.length - 1; i >= 1; i--) ts[i].parentNode.removeChild(ts[i]);
  }
  // 移除多餘的 run，以及第一個 run 內可能存在的換行符
  const brs = first.getElementsByTagName('w:br');
  for (let i = brs.length - 1; i >= 0; i--) brs[i].parentNode.removeChild(brs[i]);
  for (let i = runs.length - 1; i >= 1; i--) runs[i].parentNode.removeChild(runs[i]);
  return p;
}

/** 複製一個格式母版段落，換上新文字；text 為 null 時產生保留格式的空行。 */
function clonePara(donor, text) {
  const p = donor.cloneNode(true);
  if (text === null) {
    const runs = childrenByTag(p, 'w:r');
    for (let i = runs.length - 1; i >= 1; i--) runs[i].parentNode.removeChild(runs[i]);
    if (runs.length) {
      const ts = runs[0].getElementsByTagName('w:t');
      for (let i = ts.length - 1; i >= 0; i--) ts[i].textContent = '';
      const brs = runs[0].getElementsByTagName('w:br');
      for (let i = brs.length - 1; i >= 0; i--) brs[i].parentNode.removeChild(brs[i]);
    }
  } else {
    setParaText(p, text);
  }
  return p;
}

function clearCell(tc) {
  for (const p of parasOf(tc)) tc.removeChild(p);
  // 巢狀表格也一併清掉，避免殘留舊資料
  for (const t of childrenByTag(tc, 'w:tbl')) tc.removeChild(t);
}

/** 把儲存格內容換成單一段落文字（沿用首段格式，刪除其餘段落）。 */
function setCellText(tc, text) {
  const ps = parasOf(tc);
  if (!ps.length) return;
  setParaText(ps[0], text);
  for (let i = ps.length - 1; i >= 1; i--) tc.removeChild(ps[i]);
}

/**
 * 複製安全表現統計表並重填資料列。
 * 母版結構：外層 1x1 表格 → 內含 3x5 統計表 + 千人意外率公式註解。
 * 標題列與註解沿用母版，只換掉資料列；rows 可任意筆數。
 */
function cloneStatsBlock(donorBlock, spec) {
  const block = donorBlock.cloneNode(true);
  const inner = firstDescendantTbl(block);
  if (!inner) return block;

  const trs = rowsOf(inner);
  if (trs.length < 2) return block;

  const rowDonor = trs[1].cloneNode(true);
  for (let i = trs.length - 1; i >= 1; i--) inner.removeChild(trs[i]);

  const rowsSpec = (spec && Array.isArray(spec.rows)) ? spec.rows : [];
  for (const r of rowsSpec) {
    const tr = rowDonor.cloneNode(true);
    const tcs = cellsOf(tr);
    for (let i = 0; i < STATS_FIELDS.length && i < tcs.length; i++) {
      const raw = (r && r[STATS_FIELDS[i]] != null) ? r[STATS_FIELDS[i]] : '';
      setCellText(tcs[i], String(raw).trim());
    }
    inner.appendChild(tr);
  }
  if (!rowsSpec.length) inner.appendChild(rowDonor.cloneNode(true));

  const note = spec && spec.note;
  if (note) {
    const outerTrs = rowsOf(block);
    if (outerTrs.length) {
      const outerTcs = cellsOf(outerTrs[0]);
      if (outerTcs.length) {
        const ps = parasOf(outerTcs[0]);
        if (ps.length) setParaText(ps[ps.length - 1], String(note).trim());
      }
    }
  }
  return block;
}

/** 移除頁首/頁尾中鋪滿整頁的浮水印圖片（飛書等平台匯出時嵌入）。 */
function stripWatermarkXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  let removed = 0;
  for (const tag of ['w:drawing', 'w:pict']) {
    const nodes = doc.getElementsByTagName(tag);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.parentNode) { n.parentNode.removeChild(n); removed++; }
    }
  }
  return { xml: new XMLSerializer().serializeToString(doc), removed };
}

// ── 輸入解析 ───────────────────────────────────────────────────
function parseInput(input) {
  if (input && typeof input === 'object') return input;
  let s = String(input == null ? '' : input).trim();
  s = s.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i !== -1 && j > i) s = s.slice(i, j + 1);
  return JSON.parse(s);
}

function suggestFilename() {
  // 檔名固定留白會議次數，由秘書下載後自行改寫 X。
  // 刻意不帶入 meta.meeting_no —— 會議次數來自粵語語音轉寫，
  // 與第一頁的日期／時間／地點同樣不可盡信，統一交由人手確認。
  return OUTPUT_FILENAME;
}

// ── 主流程 ─────────────────────────────────────────────────────
async function generate(input, templateBuffer) {
  const data = parseInput(input);

  const zip = await JSZip.loadAsync(templateBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('母版不是有效的 .docx：找不到 word/document.xml');

  const doc = new DOMParser().parseFromString(await docFile.async('string'), 'text/xml');
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('母版結構異常：找不到 w:body');

  const tbl = childrenByTag(body, 'w:tbl')[0];
  if (!tbl) throw new Error('母版結構異常：找不到主表格');

  const rows = rowsOf(tbl);
  const need = Math.max(DONOR_HEADING_ROW, DONOR_SPACER_ROW, DONOR_CONTENT_ROW, DONOR_STYLE_ROW);
  if (rows.length <= need) {
    throw new Error(`母版列數不足（${rows.length} 列），請確認 template.docx 未被改動`);
  }

  // ---- 1. 抓取格式母版（必須在改動表格前抓）----
  const donorHeading = rows[DONOR_HEADING_ROW].cloneNode(true);
  const donorSpacer = rows[DONOR_SPACER_ROW].cloneNode(true);
  const donorContent = rows[DONOR_CONTENT_ROW].cloneNode(true);

  const c23 = cellsOf(rows[DONOR_CONTENT_ROW])[1];
  const c28 = cellsOf(rows[DONOR_STYLE_ROW])[1];
  const p23 = parasOf(c23), p28 = parasOf(c28);

  const donorSubtitle = p28[0].cloneNode(true);  // 粗體加底線的小標題
  const donorBody = p23[1].cloneNode(true);      // 一般正文段
  const donorBullet = p28[1].cloneNode(true);    // 項目符號段
  const donorEmpty = p23[2].cloneNode(true);     // 空行
  const donorActHdr = parasOf(cellsOf(rows[ACTION_HEADER_ROW])[2])[0].cloneNode(true);

  // 安全表現統計表（外層 1x1 表格，內含 3x5 統計表與公式註解）
  let donorStatsBlock = null;
  const statsHostTcs = cellsOf(rows[STATS_HOST_ROW]);
  if (statsHostTcs.length > 1) {
    const blocks = childrenByTag(statsHostTcs[1], 'w:tbl');
    if (blocks.length) donorStatsBlock = blocks[0].cloneNode(true);
  }

  // ---- 2. 清空第一頁的日期／時間／地點，保留出席名單 ----
  for (let ri = 0; ri < 7 && ri < rows.length; ri++) {
    const tcs = cellsOf(rows[ri]);
    if (tcs.length < 4) continue;
    const label = textOf(tcs[1]).trim();
    if (BLANK_META_FIELDS.indexOf(label) === -1) continue;
    const ps = parasOf(tcs[3]);
    if (!ps.length) continue;
    setParaText(ps[0], BLANK_PLACEHOLDER);
    for (let i = ps.length - 1; i >= 1; i--) tcs[3].removeChild(ps[i]);
  }

  // 標題段落「2026年第七次會議記錄」→ 留白
  for (const p of childrenByTag(body, 'w:p')) {
    if (textOf(p).indexOf('次會議記錄') !== -1) setParaText(p, TITLE_PLACEHOLDER);
  }

  // ---- 3. 刪掉舊的正文（第 7 列起全部移除）----
  for (let i = rows.length - 1; i >= 7; i--) tbl.removeChild(rows[i]);

  // ---- 4. 依 SECTIONS + JSON 重建正文 ----
  const secs = Array.isArray(data.sections) ? data.sections : [];
  const byTitle = {}, byNo = {};
  for (const s of secs) {
    if (s && s.title) byTitle[String(s.title).trim()] = s;
    if (s && s.no) byNo[String(s.no).trim()] = s;
  }
  const NO_MAP = { '（一）': '一', '（二）': '二', '（三）': '三', '（四）': '四',
                   '（五）': '五', '（六）': '六', '（七）': '七' };

  let firstSection = true;
  for (const [num, title] of SECTIONS) {
    // 節標題列
    const hr = donorHeading.cloneNode(true);
    tbl.appendChild(hr);
    const htcs = cellsOf(hr);
    setParaText(parasOf(htcs[0])[0], num);
    setParaText(parasOf(htcs[1])[0], title);

    if (firstSection) {
      clearCell(htcs[2]);
      htcs[2].appendChild(donorActHdr.cloneNode(true));
      firstSection = false;
    } else {
      const ap = parasOf(htcs[2]);
      if (ap.length) setParaText(ap[0], '');
    }

    tbl.appendChild(donorSpacer.cloneNode(true));

    // 取得該節內容
    const sec = byTitle[title] || byNo[NO_MAP[num]] || null;
    let items = (sec && Array.isArray(sec.items)) ? sec.items : [];
    if (!items.length) {
      items = [{ subtitle: '', content: EMPTY_TEXT[title] || DEFAULT_EMPTY, action: '記錄' }];
    }

    for (const item of items) {
      const cr = donorContent.cloneNode(true);
      tbl.appendChild(cr);
      const ctcs = cellsOf(cr);

      const contentCell = ctcs[1];
      clearCell(contentCell);

      const subtitle = String(item.subtitle || '').trim();
      if (subtitle) {
        contentCell.appendChild(clonePara(donorSubtitle, subtitle));
        contentCell.appendChild(clonePara(donorEmpty, null));
      }

      let bodyText = String(item.content || '').trim();
      if (item.uncertain && item.uncertain_note) {
        bodyText += '【待確認：' + String(item.uncertain_note).trim() + '】';
      }

      for (const raw of bodyText.split('\n')) {
        const line = raw.trim();
        if (!line) {
          contentCell.appendChild(clonePara(donorEmpty, null));
        } else if (/[；;]$/.test(line) || /^[•\-]\s*/.test(line)) {
          contentCell.appendChild(clonePara(donorBullet, line.replace(/^[•\-]\s*/, '').trim()));
        } else {
          contentCell.appendChild(clonePara(donorBody, line));
        }
      }

      // 安全表現統計表：接在正文之後
      if (item.safety_table && donorStatsBlock) {
        contentCell.appendChild(clonePara(donorEmpty, null));
        contentCell.appendChild(cloneStatsBlock(donorStatsBlock, item.safety_table));
        // Word 規定儲存格不可以表格結尾，必須補一個段落
        contentCell.appendChild(clonePara(donorEmpty, null));
      }

      if (!parasOf(contentCell).length) {
        contentCell.appendChild(clonePara(donorBody, ''));
      }

      const actionCell = ctcs[2];
      const aps = parasOf(actionCell);
      if (aps.length) {
        setParaText(aps[0], String(item.action || '記錄').trim());
        for (let i = aps.length - 1; i >= 1; i--) actionCell.removeChild(aps[i]);
      }

      tbl.appendChild(donorSpacer.cloneNode(true));
    }
  }

  // ---- 5. 寫回 zip，並清除頁首/頁尾浮水印 ----
  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));

  let watermarksRemoved = 0;
  for (const path of Object.keys(zip.files)) {
    if (!/^word\/(header|footer)\d*\.xml$/.test(path)) continue;
    const r = stripWatermarkXml(await zip.file(path).async('string'));
    if (r.removed) { zip.file(path, r.xml); watermarksRemoved += r.removed; }
  }

  const content = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { content, filename: suggestFilename(), watermarksRemoved };
}

export { generate, parseInput, suggestFilename, SECTIONS };
