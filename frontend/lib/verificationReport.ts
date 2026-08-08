import type { CitizenProfile, Scheme, StoredDocument } from '@/types';
import type { DocumentVerificationReport, VerificationIssue } from './documentVerification';
import { BRAND, markSvgString } from '@/components/Brand';

/**
 * Printable AI Verification Report.
 *
 * The on-screen report is diagnostic — it exists to be acted on. This one is evidentiary:
 * something a citizen can hand to a CSC operator, attach to a grievance, or keep as proof
 * of what was checked and when. It is also the artefact that makes the reasoning legible
 * to someone who never opens the app.
 *
 * Produced as self-contained HTML opened in a print window rather than a generated PDF.
 * That choice is deliberate: it adds zero bytes to the bundle (no jsPDF, no html2canvas),
 * works offline, and "Save as PDF" is already in every browser's print dialog. On a
 * low-end Android — the device this product targets — shipping a 300 kB PDF library to
 * produce one document would be the wrong trade.
 */

export interface ReportInput {
  profile: CitizenProfile;
  documents: StoredDocument[];
  report: DocumentVerificationReport;
  scheme?: Scheme;
}

/** Readiness is a judgement, not a number — it is what the citizen actually needs told. */
export function readinessOf(report: DocumentVerificationReport): {
  status: 'ready' | 'attention' | 'blocked' | 'empty';
  label: string;
  detail: string;
} {
  const blockers = report.issues.filter((i) => i.severity === 'blocker').length;
  const warnings = report.issues.filter((i) => i.severity === 'warning').length;

  if (report.documentsChecked === 0) {
    return {
      status: 'empty',
      label: 'No documents to check',
      detail: 'Add documents to your vault and MITRA will cross-check them before you apply.',
    };
  }
  if (blockers > 0) {
    return {
      status: 'blocked',
      label: 'Not ready to apply',
      detail: `${blockers} issue${blockers > 1 ? 's are' : ' is'} likely to cause rejection. Resolve ${blockers > 1 ? 'them' : 'it'} before submitting.`,
    };
  }
  if (warnings > 0) {
    return {
      status: 'attention',
      label: 'Ready with minor corrections',
      detail: `Your documents broadly agree. ${warnings} point${warnings > 1 ? 's are' : ' is'} worth correcting first.`,
    };
  }
  return {
    status: 'ready',
    label: 'Ready to apply',
    detail: 'All documents agree with each other and none are expired.',
  };
}

/**
 * Per-document OCR confidence.
 *
 * Derived from how completely a document was read and whether its values survived
 * cross-checking, rather than invented. A document with six extracted fields and no
 * disagreements scores high; one with two fields and a blocking mismatch scores low.
 */
export function ocrConfidence(
  doc: StoredDocument,
  issues: VerificationIssue[],
): { score: number; fieldsRead: number; note: string } {
  const fieldsRead = Object.values(doc.extracted ?? {}).filter(Boolean).length;
  const involved = issues.filter((i) => i.documentIds.includes(doc.id));
  const blockers = involved.filter((i) => i.severity === 'blocker').length;
  const warnings = involved.filter((i) => i.severity === 'warning').length;

  // Completeness ceiling: six fields is a full read.
  const completeness = Math.min(100, Math.round((fieldsRead / 6) * 100));
  const penalty = blockers * 22 + warnings * 8;
  const score = Math.max(20, Math.min(100, completeness - penalty + (doc.verified ? 6 : 0)));

  const note =
    fieldsRead === 0
      ? 'No fields could be read from this document.'
      : blockers > 0
        ? `${fieldsRead} fields read; ${blockers} value${blockers > 1 ? 's' : ''} contradicted another document.`
        : warnings > 0
          ? `${fieldsRead} fields read; ${warnings} minor variation${warnings > 1 ? 's' : ''} found.`
          : `${fieldsRead} fields read cleanly, no contradictions.`;

  return { score, fieldsRead, note };
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/** Builds the complete report document as a standalone HTML string. */
export function buildReportHtml({ profile, documents, report, scheme }: ReportInput): string {
  const readiness = readinessOf(report);
  const generated = new Date();
  // A short deterministic reference so a printed copy can be tied back to a conversation.
  const ref = `MITRA-VR-${generated.getFullYear()}${String(generated.getMonth() + 1).padStart(2, '0')}${String(generated.getDate()).padStart(2, '0')}-${Math.abs(
    [...profile.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7),
  )
    .toString(36)
    .slice(0, 5)
    .toUpperCase()}`;

  const byKind = (kind: VerificationIssue['kind']) => report.issues.filter((i) => i.kind === kind);

  const crossDoc = byKind('cross-document');
  const profileIssues = byKind('profile');
  const missing = byKind('missing');
  const expiry = byKind('expiry');

  const statusColour = {
    ready: '#047857',
    attention: '#B45309',
    blocked: '#B91C1C',
    empty: '#475569',
  }[readiness.status];

  const issueBlock = (title: string, why: string, list: VerificationIssue[]) =>
    list.length === 0
      ? ''
      : `
    <section class="block">
      <h2>${esc(title)} <span class="count">${list.length}</span></h2>
      <p class="why">${esc(why)}</p>
      ${list
        .map(
          (i) => `
        <article class="issue ${i.severity}">
          <div class="issue-head">
            <span class="sev sev-${i.severity}">${i.severity === 'blocker' ? 'Will likely cause rejection' : i.severity === 'warning' ? 'Worth correcting' : 'For information'}</span>
            <span class="cat">${esc(i.category)}</span>
            <span class="conf">${i.confidence}% confidence</span>
          </div>
          <h3>${esc(i.title)}</h3>
          <p class="detail">${esc(i.detail)}</p>
          <p class="fix"><strong>Suggested fix.</strong> ${esc(i.suggestion)}</p>
          ${i.recommendedValue ? `<p class="rec"><strong>Correct value:</strong> ${esc(i.recommendedValue)}</p>` : ''}
          ${
            i.documentIds.length
              ? `<p class="docs"><strong>Documents affected:</strong> ${esc(
                  i.documentIds
                    .map((id) => documents.find((d) => d.id === id)?.name ?? id)
                    .join(', '),
                )}</p>`
              : ''
          }
        </article>`,
        )
        .join('')}
    </section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MITRA AI Verification Report — ${esc(profile.name)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #0F172A; margin: 0; padding: 24px; line-height: 1.55; font-size: 13px;
    max-width: 820px; margin-inline: auto;
  }
  header { border-bottom: 3px solid ${BRAND.navy}; padding-bottom: 16px; margin-bottom: 22px; }
  .brandmark { display: flex; align-items: center; gap: 12px; }
  .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  h1 { font-size: 21px; margin: 0 0 4px; letter-spacing: -0.02em; }
  .sub { color: #55617A; font-size: 12px; margin: 0; }
  .ref { text-align: right; font-size: 11px; color: #55617A; }
  .ref strong { display: block; font-size: 13px; color: #0F172A; font-family: ui-monospace, monospace; }

  .verdict {
    border: 2px solid ${statusColour}; border-radius: 12px; padding: 16px 18px; margin-bottom: 22px;
    display: flex; gap: 20px; align-items: center; flex-wrap: wrap;
  }
  .score { font-size: 40px; font-weight: 800; color: ${statusColour}; line-height: 1; }
  .score span { font-size: 15px; font-weight: 600; color: #55617A; }
  .verdict-text h2 { margin: 0 0 3px; font-size: 16px; color: ${statusColour}; }
  .verdict-text p { margin: 0; color: #55617A; font-size: 12.5px; }

  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
  .metric { border: 1px solid #E6EBF5; border-radius: 10px; padding: 11px 13px; }
  .metric dt { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #55617A; font-weight: 700; margin: 0 0 4px; }
  .metric dd { margin: 0; font-size: 17px; font-weight: 700; }

  h2 { font-size: 14.5px; margin: 0 0 4px; letter-spacing: -0.01em; }
  .count { background: #EEF0F8; color: ${BRAND.navy}; border-radius: 999px; padding: 1px 8px; font-size: 11px; margin-left: 5px; vertical-align: middle; }
  .why { color: #55617A; font-size: 11.5px; margin: 0 0 12px; font-style: italic; }
  .block { margin-bottom: 24px; page-break-inside: auto; }

  .issue { border: 1px solid #E6EBF5; border-left-width: 4px; border-radius: 9px; padding: 12px 14px; margin-bottom: 10px; page-break-inside: avoid; }
  .issue.blocker { border-left-color: #B91C1C; }
  .issue.warning { border-left-color: #B45309; }
  .issue.info    { border-left-color: #1D4ED8; }
  .issue-head { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
  .sev { font-size: 10px; font-weight: 700; border-radius: 5px; padding: 2px 7px; text-transform: uppercase; letter-spacing: .04em; }
  .sev-blocker { background: #FEE2E2; color: #B91C1C; }
  .sev-warning { background: #FEF3C7; color: #B45309; }
  .sev-info    { background: #DBEAFE; color: #1D4ED8; }
  .cat { font-size: 10.5px; font-weight: 700; background: #F1F5F9; color: #334155; border-radius: 5px; padding: 2px 7px; }
  .conf { font-size: 10.5px; color: #55617A; font-weight: 600; margin-left: auto; }
  .issue h3 { font-size: 13.5px; margin: 0 0 4px; }
  .detail, .fix, .rec, .docs { margin: 0 0 5px; font-size: 12px; }
  .detail { color: #334155; }
  .fix { background: #F7F8FC; border-radius: 7px; padding: 8px 10px; }
  .rec, .docs { color: #55617A; font-size: 11.5px; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 8px 9px; border-bottom: 1px solid #E6EBF5; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #55617A; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
  .bar { display: inline-block; height: 6px; border-radius: 999px; background: ${BRAND.navy}; vertical-align: middle; margin-right: 6px; }

  .clean { border: 1px dashed #A7F3D0; background: #ECFDF5; color: #047857; border-radius: 9px; padding: 12px 14px; font-size: 12.5px; }
  footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E6EBF5; color: #55617A; font-size: 10.5px; }
  .noprint { margin-bottom: 18px; }
  button { font: inherit; font-weight: 700; background: ${BRAND.navy}; color: #fff; border: 0; border-radius: 9px; padding: 10px 18px; cursor: pointer; }
  @media print { .noprint { display: none !important; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">Save as PDF or print</button>
  </div>

  <header>
    <div class="brand">
      <div class="brandmark">
        ${markSvgString(42)}
        <div>
          <h1>AI Verification Report</h1>
          <p class="sub">MITRA — Multilingual Intelligent Technology for Responsive Assistance</p>
        </div>
      </div>
      <div class="ref">
        Reference<strong>${esc(ref)}</strong>
        ${esc(generated.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))}
      </div>
    </div>
  </header>

  <section class="verdict">
    <div class="score">${report.consistencyScore}<span>/100</span></div>
    <div class="verdict-text">
      <h2>${esc(readiness.label)}</h2>
      <p>${esc(readiness.detail)}</p>
    </div>
  </section>

  <dl class="metrics">
    <div class="metric"><dt>Applicant</dt><dd style="font-size:13px">${esc(profile.name)}</dd></div>
    <div class="metric"><dt>Documents checked</dt><dd>${report.documentsChecked}</dd></div>
    <div class="metric"><dt>Field pairs compared</dt><dd>${report.fieldsCompared}</dd></div>
    <div class="metric"><dt>Issues found</dt><dd>${report.issues.length}</dd></div>
  </dl>

  ${
    scheme
      ? `<p class="why" style="margin-top:-12px">Checked against the requirements of <strong>${esc(scheme.name)}</strong>.</p>`
      : ''
  }

  ${issueBlock(
    'Cross-document intelligence',
    'Every document compared against every other document — the checks a human reviewer would have to do by hand, and the ones most applications are rejected for.',
    crossDoc,
  )}
  ${issueBlock(
    'Profile consistency',
    'Whether the details saved in MITRA match what the documents actually say.',
    profileIssues,
  )}
  ${issueBlock(
    'Missing documents',
    'Documents this scheme requires that are not yet in the vault.',
    missing,
  )}
  ${issueBlock(
    'Document expiry',
    'Validity dates. Straightforward to check, but a common and entirely avoidable cause of rejection.',
    expiry,
  )}

  ${
    report.issues.length === 0 && report.documentsChecked > 0
      ? `<div class="clean"><strong>No inconsistencies found.</strong> All ${report.documentsChecked} documents agree on every comparable field, and none have expired.</div>`
      : ''
  }

  <section class="block">
    <h2>OCR confidence by document</h2>
    <p class="why">How completely each document was read, and whether its values held up against the others.</p>
    <table>
      <thead>
        <tr><th>Document</th><th>Owner / source</th><th>Assessment</th><th style="text-align:right">Confidence</th></tr>
      </thead>
      <tbody>
        ${documents
          .map((d) => {
            const c = ocrConfidence(d, report.issues);
            return `<tr>
              <td><strong>${esc(d.name)}</strong></td>
              <td>${esc(d.source ?? 'upload')}${d.verified ? ' · verified' : ''}</td>
              <td>${esc(c.note)}</td>
              <td class="num"><span class="bar" style="width:${Math.round(c.score / 2.5)}px"></span>${c.score}%</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </section>

  <section class="block">
    <h2>Values MITRA will auto-fill</h2>
    <p class="why">Where documents disagreed, this is the value MITRA treats as correct and the document it came from.</p>
    <table>
      <thead><tr><th>Field</th><th>Trusted value</th><th>Source</th><th style="text-align:right">Agreement</th></tr></thead>
      <tbody>
        ${
          Object.entries(report.canonicalValues).length === 0
            ? '<tr><td colspan="4">No values could be resolved yet.</td></tr>'
            : Object.entries(report.canonicalValues)
                .map(
                  ([field, v]) => `<tr>
                    <td><strong>${esc(field)}</strong></td>
                    <td>${esc(v!.value)}</td>
                    <td>${esc(documents.find((d) => d.id === v!.sourceDocId)?.name ?? v!.sourceDocId)}</td>
                    <td class="num">${Math.round(v!.agreement * 100)}%</td>
                  </tr>`,
                )
                .join('')
        }
      </tbody>
    </table>
  </section>

  <footer>
    <p><strong>How to read this report.</strong> Categories reflect the kind of check performed:
    cross-document findings come from comparing your documents against each other, which is
    reasoning MITRA performs rather than a value it looks up. Confidence expresses how certain
    the engine is that a difference is a genuine error rather than an acceptable variation such
    as a transliteration.</p>
    <p>MITRA is an independent prototype built for Smart India Hackathon 2026. It is not an
    official Government of India product. This report is advisory — confirm at a Common Service
    Centre before you rely on it. Generated ${esc(generated.toISOString())}.</p>
  </footer>
</body>
</html>`;
}

/** Opens the report in a new window, ready to print or save as PDF. */
export function openReport(input: ReportInput): boolean {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
  // Popup blocked — the caller falls back to a download so the action never silently fails.
  if (!win) return false;
  win.document.write(buildReportHtml(input));
  win.document.close();
  return true;
}

/** Fallback: downloads the report as a self-contained .html file. */
export function downloadReport(input: ReportInput): void {
  const blob = new Blob([buildReportHtml(input)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MITRA-verification-report-${input.profile.name.replace(/\s+/g, '-').toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
