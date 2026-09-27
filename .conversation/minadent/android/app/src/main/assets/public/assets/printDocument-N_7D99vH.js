const s=`
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
`,l=`
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
`;function p(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function f(t){const{title:e,styles:i,bodyHtml:o,shareText:n}=t,r=p(e),a=n?JSON.stringify(n).replace(/</g,"\\u003c"):"",d=JSON.stringify(e).replace(/</g,"\\u003c"),c=n?`<button id="mnd-share" onclick='mndShare(${a}, ${d})'>ارسال برای بیمار</button>`:"";return`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${r}</title>
<style>${i}${s}</style>
</head><body>
<div class="mnd-bar">
  <button onclick="mndBack()">‹ بازگشت</button>
  <button class="primary" onclick="mndPrint()">چاپ</button>
  ${c}
  <span class="mnd-spacer"></span>
</div>
<p id="mnd-hint" style="display:none;margin:0 0 16px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;">
  برای بازگشت، این صفحه را ببندید یا از حرکت بازگشت دستگاه استفاده کنید.
</p>
${o}
<script>${l}<\/script>
</body></html>`}export{f as b,p as e};
