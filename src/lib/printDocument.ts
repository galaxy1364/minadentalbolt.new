/**
 * MOD-FIX-011 | پوسته‌ی مشترک اسناد چاپی
 *
 * چهار جا در برنامه پنجره‌ی چاپ دستی می‌ساختند — رسید مالی، نسخه،
 * رضایت‌نامه و پرونده‌ی کامل بیمار. هر چهارتا یک نقص مشترک داشتند و
 * مهدی روی گوشی گیرش افتاد:
 *
 *   «پرینت وارد می‌شم، گزینه پرینت یا دانلود یا ارسال نداره،
 *    و گزینه برگشت نداره — باید برنامه را ببندم و دوباره وارد شوم.»
 *
 * The cause is that `window.open('', '_blank')` behaves very differently
 * inside an installed PWA than in a browser tab. There is no address bar,
 * no back gesture, and no tab strip — the generated document *is* the
 * whole screen. A document that renders nothing but content is therefore
 * a dead end, and killing the app is the only way out.
 *
 * The old code also called `win.print()` on a timer. On iOS Safari that
 * frequently does nothing at all, which is why the screen looked like a
 * plain page rather than a print dialog. Printing is now a button the
 * person presses, so a silent failure is impossible: either the dialog
 * opens or the button is visibly still there.
 *
 * Every control lives inside the generated document rather than the app,
 * because the app is not on screen at that moment.
 */

export interface PrintDocumentOptions {
  /** عنوان پنجره و سند. */
  title: string
  /** استایل مخصوص همین سند. پوسته استایل نوار ابزار را خودش می‌افزاید. */
  styles: string
  /** بدنه‌ی HTML سند. */
  bodyHtml: string
  /**
   * متن ساده برای «ارسال برای بیمار». اگر ندهید، دکمه‌ی اشتراک‌گذاری
   * ساخته نمی‌شود — دکمه‌ای که کاری نمی‌کند از نبودنش بدتر است.
   */
  shareText?: string
}

/** نوار ابزار هرگز روی کاغذ نمی‌آید. */
const TOOLBAR_STYLES = `
  .mnd-bar {
    position: sticky; top: 0; z-index: 999;
    display: flex; gap: 8px; align-items: center;
    padding: 10px 12px; margin: -28px -28px 20px;
    background: #ffffff; border-bottom: 1px solid #e2e8f0;
    font-family: Tahoma, Arial, sans-serif;
  }
  .mnd-bar button {
    font-family: inherit; font-size: 13px; font-weight: bold;
    padding: 9px 16px; border-radius: 10px; cursor: pointer;
    border: 1px solid #cbd5e1; background: #f8fafc; color: #334155;
    min-height: 40px;
  }
  .mnd-bar button.primary { background: #0d9488; border-color: #0d9488; color: #fff; }
  .mnd-bar .mnd-spacer { flex: 1; }
  @media print { .mnd-bar { display: none !important; } body { padding-top: 10px !important; } }
`

/**
 * Closing a script-opened window normally works, but not in every PWA
 * shell, so history.back() is tried next and an explanatory line is shown
 * only if both fail. Silently doing nothing is what created the trap in
 * the first place.
 */
const TOOLBAR_SCRIPT = `
  function mndBack() {
    window.close();
    setTimeout(function () {
      if (!window.closed) {
        if (window.history.length > 1) { window.history.back(); return; }
        var n = document.getElementById('mnd-hint');
        if (n) n.style.display = 'block';
      }
    }, 150);
  }
  function mndPrint() { window.print(); }
  function mndShare(text, title) {
    if (navigator.share) { navigator.share({ title: title, text: text }).catch(function () {}); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        var b = document.getElementById('mnd-share');
        if (b) { b.textContent = 'کپی شد ✓'; }
      }).catch(function () {});
    }
  }
`

/** HTML-escape for values that land inside markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Builds a complete printable document that a person can always leave.
 */
export function buildPrintDocument(options: PrintDocumentOptions): string {
  const { title, styles, bodyHtml, shareText } = options
  const safeTitle = escapeHtml(title)

  // JSON.stringify handles quotes, newlines and backslashes; the closing
  // angle bracket is neutralised so a stray "</script>" inside patient
  // text cannot terminate the block early.
  const shareArg = shareText ? JSON.stringify(shareText).replace(/</g, '\\u003c') : ''
  const titleArg = JSON.stringify(title).replace(/</g, '\\u003c')

  const shareButton = shareText
    ? `<button id="mnd-share" onclick='mndShare(${shareArg}, ${titleArg})'>ارسال برای بیمار</button>`
    : ''

  return `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>${styles}${TOOLBAR_STYLES}</style>
</head><body>
<div class="mnd-bar">
  <button onclick="mndBack()">‹ بازگشت</button>
  <button class="primary" onclick="mndPrint()">چاپ</button>
  ${shareButton}
  <span class="mnd-spacer"></span>
</div>
<p id="mnd-hint" style="display:none;margin:0 0 16px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;">
  برای بازگشت، این صفحه را ببندید یا از حرکت بازگشت دستگاه استفاده کنید.
</p>
${bodyHtml}
<script>${TOOLBAR_SCRIPT}</script>
</body></html>`
}
