import{j as t,al as z,ak as O,e as w,g as S,k as v,h as j,t as U,d as me,v as St,m as wt,q as kt,p as Ct,bF as Be,c as It,z as _,bG as ve,an as $t,ag as ce,$ as ue,C as je,Y as Tt,B as le,bb as Mt,ar as Z,aR as Re,bH as Pt,am as Fe,bI as Dt,bt as Ee,bJ as Ke,bK as qt,bL as zt,bM as Ot,bN as Lt,bO as At,bP as Ge,bA as Bt,bD as Rt,bQ as Ft,bR as Et}from"./index-CGUuXpKJ.js";import{r as b,u as We,e as Kt}from"./vendor-react-CUTMqg7W.js";import{C as J}from"./CurrencyInput-9oARyvvf.js";import{X as Gt,x as He,as as Ne,g as Wt,i as Ht,d as Ut,at as Ue,O as Se,h as Vt,n as Qt,J as Zt,c as Xt,aa as Jt,K as Yt,j as ea,ar as Ve,ag as ta,ah as aa,ae as sa,aO as Qe,a as la}from"./vendor-icons-CXCZz8nB.js";import{P as na}from"./PatientDebtBar-Bt2B2RFn.js";import{P as ra}from"./PatientSelect-C_ZZr86p.js";import{P as oa}from"./PatientAlerts-BN1Dj4am.js";import{d as ia}from"./icsReminder-CigsyQ59.js";import{b as da,e as q}from"./printDocument-N_7D99vH.js";import{c as ca,v as ua}from"./implants-B4qWXBAc.js";import{B as Ze}from"./BarcodeScanner-DKiyGIWC.js";import{u as ma}from"./ConfirmAction-HGohfOG8.js";import{P as we}from"./PersianDateInput-BxGk2zc-.js";import{T as pa}from"./ToothArchSelect-mmTzLS-U.js";import{r as ba}from"./chartHandoff-DvZ05maU.js";import{M as xa,R as ga,a as X}from"./ModuleHeader-B6Tnqoit.js";import"./vendor-dexie-BigZnyxg.js";import"./vendor-supabase-wIXNjVJv.js";import"./patientAlerts-BrN9jC7u.js";import"./PersianCalendar-DRuS9KAq.js";import"./ToothGlyph-avDmXTpa.js";const Je=[{kind:"extraction",label:"کشیدن دندان",group:"surgical"},{kind:"bone_graft",label:"پیوند استخوان (پودر)",group:"surgical"},{kind:"membrane",label:"ممبران",group:"surgical"},{kind:"sinus_lift",label:"سینوس لیفت",group:"surgical"},{kind:"gum_surgery",label:"جراحی لثه",group:"surgical"},{kind:"gbr",label:"بازسازی استخوان (GBR)",group:"surgical"},{kind:"immediate_loading",label:"بارگذاری فوری",group:"surgical"},{kind:"jaw_surgery",label:"جراحی فک",group:"surgical"},{kind:"surgeon_fee",label:"دستمزد جراح",group:"fee"},{kind:"prosthodontist_fee",label:"دستمزد پروتزکار",group:"fee"},{kind:"crown_pfm",label:"روکش PFM",group:"prosthetic",countable:!0,hasRetention:!0},{kind:"crown_zirconia",label:"روکش زیرکونیا",group:"prosthetic",countable:!0,hasRetention:!0},{kind:"crown_ips",label:"روکش IPS",group:"prosthetic",countable:!0,hasRetention:!0},{kind:"pontic",label:"پونتیک",group:"prosthetic",countable:!0},{kind:"abutment",label:"اباتمنت",group:"prosthetic",countable:!0},{kind:"other",label:"سایر",group:"surgical"}],pe={cemented:"چسبی",screw:"پیچ‌شونده"},ha={surgical:"جراحی",fee:"دستمزد",prosthetic:"پروتز"};function ee(s){return Je.find(o=>o.kind===s)??{kind:s,label:s,group:"surgical"}}function be(s){const o=Math.max(1,Math.floor(Number(s.quantity)||1)),d=Math.max(0,Number(s.unit_price)||0);return o*d}function Ye(s){return s.filter(o=>o.is_active!==!1).reduce((o,d)=>o+be(d),0)}function _a(s,o){return Math.max(0,Number(s)||0)+Ye(o)}function fa(s){const o={surgical:0,fee:0,prosthetic:0};for(const d of s)d.is_active!==!1&&(o[ee(d.kind).group]+=be(d));return o}function et(s){const o=ee(s.kind),d=s.label||o.label,N=o.countable&&s.quantity>1?`${s.quantity} × `:"",f=s.variant&&pe[s.variant]?` (${pe[s.variant]})`:"";return`${N}${d}${f}`}function ya(s){if(!s)return null;const o=new Date(`${String(s).slice(0,10)}T00:00:00Z`);return Number.isNaN(o.getTime())?null:(o.setUTCDate(o.getUTCDate()-14),o.toISOString().slice(0,10))}const Xe={crown_pfm:"pfm",crown_zirconia:"zirconia",crown_ips:"ips_emax"};function va(s,o){var F;const d=o.filter(r=>r.is_active!==!1),N=d.filter(r=>r.kind in Xe),f=d.filter(r=>r.kind==="pontic"),I=s.prosthesis_doctor_id||s.doctor_id||null,$=N.reduce((r,u)=>r+Math.max(1,Math.floor(Number(u.quantity)||1)),0),L=f.reduce((r,u)=>r+Math.max(1,Math.floor(Number(u.quantity)||1)),0),C=N.length?Xe[N[0].kind]:null,A=((F=N.find(r=>r.variant))==null?void 0:F.variant)??null,k=[];for(const r of N)k.push(et(r));L>0&&k.push(`${L} × پونتیک`),A&&k.push(`نگهداری: ${pe[A]??A}`);const M=k.length?`روکش ایمپلنت — ${k.join("، ")}`:"روکش ایمپلنت";return{patient_id:s.patient_id,doctor_id:I,tooth_number:s.tooth_number??null,work_type:$+L>1?"bridge":"implant_crown",material:C,units:Math.max(1,$+L),notes:M}}let ja=0;const Na=()=>`new-${Date.now()}-${ja++}`,Sa=["surgical","fee","prosthetic"];function wa({items:s,onChange:o,doctors:d,fixturePrice:N}){const f=b.useMemo(()=>s.filter(r=>r.is_active!==!1),[s]),I=b.useMemo(()=>fa(f),[f]),$=N+Ye(f),L=[{value:"",label:"بدون پزشک"},...d.map(r=>({value:r.id,label:r.name||"پزشک"}))],C=Object.entries(pe).map(([r,u])=>({value:r,label:u})),A=r=>f.some(u=>u.kind===r),k=r=>{if(v.playPop(),j.select(),r!=="other"&&A(r)){o(s.flatMap(g=>g.kind!==r||g.is_active===!1?[g]:g.id?[{...g,is_active:!1}]:[]));return}const u=ee(r);o([...s,{_key:Na(),kind:r,label:r==="other"?"":u.label,variant:null,quantity:1,unit_price:0,doctor_id:null,is_active:!0}])},M=(r,u)=>o(s.map(g=>g._key===r?{...g,...u}:g)),F=r=>{v.playPop(),j.delete(),o(s.flatMap(u=>u._key!==r?[u]:u.id?[{...u,is_active:!1}]:[]))};return t.jsxs("div",{className:"space-y-3",children:[Sa.map(r=>t.jsxs("div",{children:[t.jsx("p",{className:"text-[11px] font-bold text-slate-500 mb-1.5",children:ha[r]}),t.jsxs("div",{className:"flex flex-wrap gap-1.5",children:[Je.filter(u=>u.group===r&&u.kind!=="other").map(u=>{const g=A(u.kind);return t.jsx("button",{type:"button","aria-pressed":g,onClick:()=>k(u.kind),className:`px-3 py-1.5 rounded-xl text-xs font-bold transition-all-smooth press-scale ${g?"bg-primary-600 text-white":"bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`,children:u.label},u.kind)}),r==="surgical"&&t.jsx("button",{type:"button",onClick:()=>k("other"),className:"px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-slate-300 text-slate-500 press-scale",children:"+ سایر"})]})]},r)),f.length>0&&t.jsx("div",{className:"space-y-2 pt-1",children:f.map(r=>{const u=ee(r.kind);return t.jsxs("div",{className:"p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[r.kind==="other"?t.jsx("input",{value:r.label,onChange:g=>M(r._key,{label:g.target.value}),placeholder:"عنوان — مثلاً لیزر",className:"flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"}):t.jsx("span",{className:"flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate",children:r.label}),t.jsx("button",{type:"button",onClick:()=>F(r._key),"aria-label":`حذف ${r.label}`,className:"p-1 rounded-lg text-slate-400 hover:text-error-600 press-scale transition-all-smooth",children:t.jsx(Gt,{size:14})})]}),t.jsxs("div",{className:`grid gap-2 ${u.countable?"grid-cols-2":"grid-cols-1"}`,children:[t.jsx(J,{label:"",value:String(r.unit_price||""),onChange:g=>M(r._key,{unit_price:Number(g)||0}),placeholder:"قیمت (تومان)"}),u.countable&&t.jsx(z,{label:"",type:"number",value:String(r.quantity),onChange:g=>M(r._key,{quantity:Math.max(1,Number(g)||1)}),placeholder:"تعداد"})]}),u.hasRetention&&t.jsx(O,{label:"",value:r.variant||"",onChange:g=>M(r._key,{variant:g||null}),options:C,placeholder:"چسبی یا پیچ‌شونده"}),u.group==="fee"&&t.jsx(O,{label:"",value:r.doctor_id||"",onChange:g=>M(r._key,{doctor_id:g||null}),options:L,placeholder:"دستمزد مال کدام پزشک"}),u.countable&&r.quantity>1&&t.jsxs("p",{className:"text-[11px] text-slate-500",children:[w(r.quantity)," × ",S(r.unit_price)," = ",S(be(r))," ت"]})]},r._key)})}),t.jsxs("div",{className:"p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1",children:[t.jsxs("div",{className:"flex justify-between text-slate-500",children:[t.jsx("span",{children:"فیکسچر"}),t.jsxs("span",{children:[S(N)," ت"]})]}),I.surgical>0&&t.jsxs("div",{className:"flex justify-between text-slate-500",children:[t.jsx("span",{children:"جراحی"}),t.jsxs("span",{children:[S(I.surgical)," ت"]})]}),I.fee>0&&t.jsxs("div",{className:"flex justify-between text-slate-500",children:[t.jsx("span",{children:"دستمزد"}),t.jsxs("span",{children:[S(I.fee)," ت"]})]}),I.prosthetic>0&&t.jsxs("div",{className:"flex justify-between text-slate-500",children:[t.jsx("span",{children:"پروتز"}),t.jsxs("span",{children:[S(I.prosthetic)," ت"]})]}),t.jsxs("div",{className:"flex justify-between font-bold text-slate-800 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700",children:[t.jsx("span",{children:"جمع کل"}),t.jsxs("span",{children:[S($)," ت"]})]})]})]})}function ka({implantCase:s,patient:o,doctor:d,prosthesisDoctor:N,clinicName:f="کلینیک تخصصی دندانپزشکی مینا",clinicPhone:I="۰۲۱-۸۸۸۸۸۸۸۸",clinicAddress:$="تهران، خیابان ولیعصر"}){const L=`${o.first_name||""} ${o.last_name||""}`.trim()||"مراجع گرامی",C=d!=null&&d.name?`دکتر ${d.name}`:"متخصص جراحی فک و صورت / ایمپلنتولوژیست",A=N!=null&&N.name?`دکتر ${N.name}`:d!=null&&d.name?`دکتر ${d.name}`:"متخصص پروتزهای دندانی",k=me(new Date().toISOString().slice(0,10)),M=s.surgery_date?me(s.surgery_date):"-",F=s.crown_delivery_date?me(s.crown_delivery_date):"-",r=s.tooth_number?U(s.tooth_number):"-",u=s.brand||"-",g=s.model||"-",G=s.diameter?`${w(s.diameter)} mm`:"-",ne=s.length?`${w(s.length)} mm`:"-",W=s.lot_number||"ثبت در پرونده",re=s.serial_number||"ثبت در پرونده",H=s.torque_ncm?`${w(s.torque_ncm)} N.cm`:"۳۵-۴۵ N.cm (استاندارد)",oe=s.isq_value?w(s.isq_value):"≥ ۷۰ (High Stability)",xe=s.bone_density?`کلاس ${s.bone_density}`:"-",E=s.bone_graft?"انجام شد (آلوگرافت/زنوگرافت)":"نیاز نبوده (نرمال)",ge=s.sinus_lift?"انجام شد":"خیر",V=s.warranty_years?`${w(s.warranty_years)} سال ضمانت طلایی`:"ضمانت استاندارد کارخانه",x=s.abutment_type||"کاستوم تیتانیوم / زیرکونیا",te=s.crown_material||"زیرکونیا تمام سرامیک (Full Zirconia)";return`
  <div class="passport-card" dir="rtl">
    <!-- Certificate Header -->
    <div class="cert-header">
      <div class="cert-logo-box">
        <div class="cert-emblem">ITI / ISO</div>
      </div>
      <div class="cert-title-box">
        <h1 class="cert-title">شناسنامه و کارت ضمانت رسمی ایمپلنت دندان</h1>
        <p class="cert-subtitle">Official Dental Implant Passport & Warranty Certificate</p>
        <p class="cert-clinic">${q(f)}</p>
      </div>
      <div class="cert-badge">
        <span class="cert-id">کد شناسه: ${w(s.id.slice(0,8).toUpperCase())}</span>
        <span class="cert-date">تاریخ صدور: ${k}</span>
      </div>
    </div>

    <!-- Patient & Case Metadata Bar -->
    <div class="meta-section">
      <div class="meta-item">
        <span class="meta-label">نام و نام خانوادگی بیمار:</span>
        <span class="meta-val highlight">${q(L)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">کد ملی:</span>
        <span class="meta-val" dir="ltr">${o.national_id?w(o.national_id):"-"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">شماره پرونده:</span>
        <span class="meta-val" dir="ltr">${o.file_number?w(o.file_number):"-"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">موقعیت دندان:</span>
        <span class="meta-val highlight">${r}</span>
      </div>
    </div>

    <!-- 2 Column Tech Specs (Surgery / Fixture vs Prosthetics) -->
    <div class="specs-grid">
      <!-- Fixture & Surgical Specs -->
      <div class="spec-col">
        <h3 class="col-title">۱. مشخصات پایه فیکسچر و جراحی (Surgical Specs)</h3>
        <table class="spec-table">
          <tr><td>برند و کمپانی سازنده:</td><td><strong>${q(u)}</strong></td></tr>
          <tr><td>مدل و لاین فیکسچر:</td><td>${q(g)}</td></tr>
          <tr><td>قطر / طول فیکسچر:</td><td dir="ltr">${G} × ${ne}</td></tr>
          <tr><td>شماره بچ / LOT No:</td><td dir="ltr">${q(W)}</td></tr>
          <tr><td>شماره سریال فیکسچر:</td><td dir="ltr">${q(re)}</td></tr>
          <tr><td>تورک جای‌گذاری (Torque):</td><td>${H}</td></tr>
          <tr><td>شاخص ثبات اولیه (ISQ):</td><td>${oe}</td></tr>
          <tr><td>کیفیت و تراکم استخوان:</td><td>${xe}</td></tr>
          <tr><td>پیوند استخوان (Bone Graft):</td><td>${E}</td></tr>
          <tr><td>سینوس لیفت (Sinus Lift):</td><td>${ge}</td></tr>
          <tr><td>تاریخ جراحی کاشت:</td><td>${M}</td></tr>
          <tr><td>پزشک جراح فک و صورت / ایمپلنت:</td><td>${q(C)}</td></tr>
        </table>
      </div>

      <!-- Prosthodontic Specs -->
      <div class="spec-col">
        <h3 class="col-title">۲. مشخصات پروتز و روکش (Prosthodontic Specs)</h3>
        <table class="spec-table">
          <tr><td>نوع قطعه واسط (Abutment):</td><td>${q(x)}</td></tr>
          <tr><td>جنس و ساختار روکش:</td><td><strong>${q(te)}</strong></td></tr>
          <tr><td>نحوه اتصال پروتز:</td><td>Screw-Retained / Cement-Retained</td></tr>
          <tr><td>تاریخ تحویل نهایی روکش:</td><td>${F}</td></tr>
          <tr><td>پزشک متخصص پروتز دندانی:</td><td>${q(A)}</td></tr>
          <tr><td>مدت ضمانت‌نامه کلینیک و سازنده:</td><td><strong class="warranty-badge">${V}</strong></td></tr>
        </table>

        <div class="care-instructions">
          <h4 class="care-title">راهنمای مراقبت و حفظ سلامت ایمپلنت:</h4>
          <ul class="care-list">
            <li>رعایت دقیق بهداشت با مسواک مخصوص، نخ سوپرفلاس و دستگاه واترپیک (واترجت).</li>
            <li>پرهیز از شکستن اجسام بسیار سخت با دندان ایمپلنت‌شده.</li>
            <li>مراجعه منظم هر ۶ الی ۱۲ ماه جهت چکاپ رادیوگرافی و پیشگیری از بیماری‌های پری‌ایمپلنت.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Official Stamp & Verification Footer -->
    <div class="cert-footer">
      <div class="sign-box">
        <p class="sign-title">مهر و امضای پزشک جراح</p>
        <div class="sign-space"></div>
      </div>
      <div class="sign-box">
        <p class="sign-title">مهر و امضای پزشک پروتزیست</p>
        <div class="sign-space"></div>
      </div>
      <div class="seal-box">
        <div class="official-seal">
          <span>ضمانت اصالت قطعات</span>
          <span>ORIGINAL ITI APPROVED</span>
        </div>
      </div>
    </div>

    <!-- Clinic contact line -->
    <div class="clinic-bar">
      <span>${q($)}</span>
      <span> | تلفن تماس پشتیبانی: </span>
      <span dir="ltr">${w(I)}</span>
    </div>
  </div>
  `}const Ca=`
  @page {
    size: A4 landscape;
    margin: 10mm;
  }
  body {
    font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif;
    color: #0f172a;
    background: #f8fafc;
    margin: 0;
    padding: 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .passport-card {
    max-width: 1050px;
    margin: 0 auto;
    background: #ffffff;
    border: 3px double #0d9488;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
  }
  .cert-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }
  .cert-emblem {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
  }
  .cert-title-box {
    text-align: center;
    flex: 1;
    padding: 0 16px;
  }
  .cert-title {
    font-size: 20px;
    font-weight: 900;
    color: #0f766e;
    margin: 0 0 4px;
  }
  .cert-subtitle {
    font-size: 11px;
    color: #64748b;
    margin: 0 0 4px;
    letter-spacing: 0.5px;
    font-family: Arial, sans-serif;
  }
  .cert-clinic {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    margin: 0;
  }
  .cert-badge {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: #475569;
  }
  .cert-id {
    font-family: monospace;
    font-weight: 800;
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .meta-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .meta-label {
    font-size: 11px;
    color: #0f766e;
    font-weight: 600;
  }
  .meta-val {
    font-size: 13px;
    color: #1e293b;
    font-weight: 700;
  }
  .meta-val.highlight {
    color: #0d9488;
  }
  .specs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .spec-col {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px;
  }
  .col-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f766e;
    margin: 0 0 10px;
    border-bottom: 1px dashed #cbd5e1;
    padding-bottom: 6px;
  }
  .spec-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }
  .spec-table td {
    padding: 5px 4px;
    border-bottom: 1px solid #f1f5f9;
  }
  .spec-table td:first-child {
    color: #64748b;
    width: 46%;
  }
  .spec-table td:last-child {
    color: #1e293b;
    text-align: left;
  }
  .warranty-badge {
    background: #ecfdf5;
    color: #047857;
    padding: 2px 6px;
    border-radius: 6px;
    border: 1px solid #a7f3d0;
  }
  .care-instructions {
    margin-top: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
  }
  .care-title {
    font-size: 11px;
    font-weight: 800;
    color: #334155;
    margin: 0 0 4px;
  }
  .care-list {
    margin: 0;
    padding-right: 16px;
    font-size: 10.5px;
    color: #475569;
    line-height: 1.6;
  }
  .cert-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
  }
  .sign-box {
    text-align: center;
    flex: 1;
  }
  .sign-title {
    font-size: 11px;
    color: #64748b;
    margin: 0 0 6px;
  }
  .sign-space {
    height: 44px;
    border-bottom: 1px dotted #94a3b8;
  }
  .seal-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .official-seal {
    border: 2px dashed #0d9488;
    color: #0d9488;
    border-radius: 50%;
    width: 90px;
    height: 90px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 8.5px;
    font-weight: 800;
    text-align: center;
    line-height: 1.3;
    padding: 6px;
  }
  .clinic-bar {
    margin-top: 16px;
    text-align: center;
    font-size: 10.5px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }
  @media print {
    body { padding: 0; background: #fff; }
    .passport-card { box-shadow: none; border-width: 2px; }
  }
`;function Ia(s){const o=window.open("","_blank");if(!o)return null;const d=`${s.patient.first_name||""} ${s.patient.last_name||""}`.trim(),N=`شناسنامه و کارت گارانتی ایمپلنت دندان — ${d||"بیمار"}`,f=ka(s),I=`شناسنامه و کارت ضمانت رسمی ایمپلنت دندان ${s.implantCase.tooth_number?U(s.implantCase.tooth_number):""} — ${d}
برند: ${s.implantCase.brand||"-"}
گارانتی: ${s.implantCase.warranty_years||0} سال
کلینیک دندانپزشکی مینا`,$=da({title:N,styles:Ca,bodyHtml:f,shareText:I});return o.document.write($),o.document.close(),o}const Ie=[{value:"planned",label:"برنامه‌ریزی شده",color:"slate",icon:"📋"},{value:"surgery_done",label:"جراحی انجام شد",color:"primary",icon:"🔪"},{value:"lab",label:"در لابراتوار",color:"accent",icon:"🧪"},{value:"healing",label:"در حال بهبود",color:"warning",icon:"⏳"},{value:"impression",label:"قالب‌گیری",color:"accent",icon:"🦷"},{value:"crown_delivery",label:"تحویل روکش",color:"secondary",icon:"👑"},{value:"completed",label:"تکمیل شده",color:"success",icon:"✅"},{value:"failed",label:"ناموفق",color:"error",icon:"❌"}],Y=[{value:"straumann",label:"استراومن (Straumann)",models:["BLT","BLX","TLX","ITI","SLActive","SLActive HB"]},{value:"nobel_biocare",label:"نوبل بیوکر (Nobel Biocare)",models:["Replace","NobelActive","Branemark","NobelReplace Tapered","Speedy Groovy"]},{value:"osstem",label:"اسستم (Osstem)",models:["GS-II","GS-III","SS-II","MS-II","TS-II","TS-III","SA","CA"]},{value:"dentium",label:"دنتیوم (Dentium)",models:["SuperLine","SimpleLine","Implantium","Nuvia","Dio"]},{value:"mega_gen",label:"مگا جن (MegaGen)",models:["AnyRidge","AnyOne","XPEED","Rescue","MegaGen ER","MegaGen Bio-Tem"]},{value:"neobiotech",label:"نئوبایوتک (NeoBiotech)",models:["NB","Spline","IS-II Active","IS-III Active"]},{value:"biohorizons",label:"بیوهورایزن (BioHorizons)",models:["Tapered Internal","Tapered External","Laser-Lok","MiniLok"]},{value:"zimmer",label:"زیمر (Zimmer)",models:["Tapered Screw-Vent","SVT","AdVent","SwissPlus"]},{value:"muller",label:"مولر (Müller)",models:["Müller Standard","Müller Premium","Müller Bio-Tem"]},{value:"bio_teen",label:"بایو-تین (BioTeen)",models:["BT-Active","BT-Classic","BT-Bio-Tem"]},{value:"dio",label:"دیو (DIO)",models:["DIO SM","DIO UF","DIO Navi","DIO Implant"]},{value:"hiossen",label:"هیوسن (Hiossen)",models:["OneStop","SureTek","PlusTek","Sequence"]},{value:"dentis",label:"دنتیس (Dentis)",models:["Dentis OneQ","Dentis Q-Implant","Dentis S-Line"]},{value:"kavo",label:"کاوو (KaVo)",models:["KaVo Imp","KaVo AB"]},{value:"thermax",label:"ترمکس (Thermax)",models:["Thermax Bio","Thermax Standard"]},{value:"sic",label:"اس‌آی‌سی (SIC Invent)",models:["SIC max","SIC ace","SIC vantage"]},{value:"other",label:"سایر (وارد کردن دستی نام)",models:[]}],tt=[{value:"fixture",label:"فیکسچر (Fixture)"},{value:"healing_abutment",label:"هیلینگ آباتمنت (Healing Abutment)"},{value:"impression_post",label:"پست قالب‌گیری (Impression Post)"},{value:"abutment",label:"آباتمنت (Abutment)"},{value:"crown",label:"روکش (Crown)"},{value:"screw",label:"پیچ (Screw)"},{value:"other",label:"سایر"}],$e=[{value:"pending",label:"در انتظار",color:"slate"},{value:"success",label:"موفق",color:"success"},{value:"failed",label:"ناموفق",color:"error"}];function $a(s){return Ie.find(o=>o.value===s)||Ie[0]}function Ta(s){return $e.find(o=>o.value===s)||$e[0]}function ke(s){var o;return((o=Y.find(d=>d.value===s))==null?void 0:o.label)||s||"-"}function Ma(s){var o;return((o=Y.find(d=>d.value===s))==null?void 0:o.models)||[]}function Ce(s){var o;return((o=tt.find(d=>d.value===s))==null?void 0:o.label)||s||"-"}function Ya(){const{confirmAction:s,ConfirmActionModal:o}=ma(),d=We(),N=Kt(),[f,I]=b.useState([]),[$,L]=b.useState([]),[C,A]=b.useState([]),[k,M]=b.useState([]),[F,r]=b.useState(!0),[u,g]=b.useState(""),[G,ne]=b.useState(""),[W,re]=b.useState(""),[H,oe]=b.useState(""),[xe,E]=b.useState(!1),[ge,V]=b.useState(0),[x,te]=b.useState(null),[at,Te]=b.useState(!1),[st,he]=b.useState(!1),[lt,_e]=b.useState(!1),[nt,fe]=b.useState(!1),[rt,Me]=b.useState(0),[Pe,ot]=b.useState(null),[it,De]=b.useState(!1),[qe,ie]=b.useState([]),[ye,dt]=b.useState([]),[ct,ut]=b.useState([]),ze=We(),[a,p]=b.useState({patient_id:"",doctor_id:"",tooth_number:"",brand:"",custom_brand:"",model:"",diameter:"",length:"",surgery_date:"",healing_months:"",opg_reminder_date:"",total_cost:"",paid_amount:"",warranty_years:"",torque_ncm:"",isq_value:"",lot_number:"",serial_number:"",bone_density:"",abutment_type:"",crown_material:"",notes:"",surgery_fee_mode:"formula",surgery_fee_amount:"",prosthesis_doctor_id:"",prosthesis_fee_amount:""}),[c,T]=b.useState({component_type:"fixture",brand:"",model:"",serial_number:"",cost:"",placed_date:"",notes:"",include_in_doctor_share:!0,inventory_item_id:""}),B=b.useCallback(async()=>{r(!0);try{const[e,l,n,m,y,P]=await Promise.all([St(),wt(),kt(),Ct(),Be(),It()]);dt(y),ut(P),I(e.filter(h=>h.is_active!==!1)),L(l),A(n),M(m.filter(h=>h.quantity>0))}catch(e){console.error("Error loading implant cases:",e),_("error","خطا در بارگذاری موارد ایمپلنت")}finally{r(!1)}},[]);b.useEffect(()=>{B()},[B]),b.useEffect(()=>{const e=ba(N.state),l=N.state;l!=null&&l.quickStartPatientId&&(te(null),V(0),p({patient_id:l.quickStartPatientId,doctor_id:l.quickStartDoctorId||"",tooth_number:(e==null?void 0:e.toothNumber)||"",brand:"",custom_brand:"",model:"",diameter:"",length:"",surgery_date:"",healing_months:"",opg_reminder_date:"",total_cost:"",paid_amount:"",warranty_years:"",notes:"",torque_ncm:"",isq_value:"",lot_number:"",serial_number:"",bone_density:"",abutment_type:"",crown_material:"",surgery_fee_mode:"formula",surgery_fee_amount:"",prosthesis_doctor_id:"",prosthesis_fee_amount:""}),E(!0),window.history.replaceState({},""))},[N.state]);const Oe=b.useMemo(()=>f.filter(e=>{if(u){const l=e.patient?`${e.patient.first_name} ${e.patient.last_name}`:"",n=e.tooth_number||"",m=u.toLowerCase();if(!l.toLowerCase().includes(m)&&!n.toLowerCase().includes(m))return!1}return!(G&&ve(e,new Date().toISOString().slice(0,10))!==G||W&&e.brand!==W||H&&e.success_status!==H)}),[f,u,G,W,H]),Q=b.useMemo(()=>{const e=f.length,l=new Date().toISOString().slice(0,10),n=f.map(i=>ve(i,l)),m=n.filter(i=>i==="surgery_done").length,y=n.filter(i=>i==="healing").length,P=n.filter(i=>i==="completed").length,h=f.filter(i=>i.success_status==="success").length,D=e>0?h/e*100:0,R=f.reduce((i,ae)=>i+(ae.total_cost||0),0);return{total:e,inSurgery:m,healing:y,completed:P,successRate:D,totalValue:R}},[f]),K=e=>e.patient?`${e.patient.first_name} ${e.patient.last_name}`:"نامشخص",mt=e=>e.doctor?e.doctor.name||e.doctor.specialty||"پزشک":"-",pt=b.useMemo(()=>C.map(e=>({value:e.id,label:e.name||e.specialty||"پزشک"})),[C]),Le=()=>{j.tap(),te(null),ie([]),V(0),p({patient_id:"",doctor_id:"",tooth_number:"",brand:"",custom_brand:"",model:"",diameter:"",length:"",surgery_date:"",healing_months:"",opg_reminder_date:"",total_cost:"",paid_amount:"",warranty_years:"",notes:"",torque_ncm:"",isq_value:"",lot_number:"",serial_number:"",bone_density:"",abutment_type:"",crown_material:"",surgery_fee_mode:"formula",surgery_fee_amount:"",prosthesis_doctor_id:"",prosthesis_fee_amount:""}),E(!0)},bt=async e=>{for(const l of qe){const n={kind:l.kind,label:l.label,variant:l.variant??null,quantity:Math.max(1,Math.floor(Number(l.quantity)||1)),unit_price:Math.max(0,Number(l.unit_price)||0),doctor_id:l.doctor_id||null,is_active:l.is_active!==!1};l.id?await Ft(l.id,n):n.is_active&&await Et({...n,clinic_id:"",implant_case_id:e,notes:null})}},xt=async(e,l)=>{j.tap();const n=new Date().toISOString().slice(0,10);try{if(l==="surgery_booked"||l==="impression"){ze("/appointments",{state:{quickStartPatientId:e.patient_id,quickStartDoctorId:l==="impression"&&e.prosthesis_doctor_id||e.doctor_id,implantCaseId:e.id,implantStep:l}});return}if(l==="healing"){Ae(e);return}if(l==="opg")await Z(e.id,{opg_reminder_date:n}),v.playSuccess(),_("success","عکس OPG ثبت شد");else if(l==="lab"){gt(e);return}else l==="delivered"&&(await Z(e.id,{crown_delivery_date:n}),v.playSuccess(),_("success","تحویل روکش ثبت شد"));await B()}catch{v.playWarning(),_("error","خطا در ثبت این گام")}},gt=e=>{j.tap();const l=ye.filter(m=>m.implant_case_id===e.id),n=va(e,l);ze("/laboratory",{state:{fromImplantCaseId:e.id,order:n}})},Ae=e=>{j.tap(),te(e),Be(e.id).then(n=>ie(n.map(m=>({...m,_key:m.id})))).catch(()=>ie([]));const l=Y.some(n=>n.value===e.brand);p({patient_id:e.patient_id,doctor_id:e.doctor_id||"",tooth_number:e.tooth_number||"",brand:l?e.brand||"":e.brand?"other":"",custom_brand:l?"":e.brand||"",model:e.model||"",diameter:e.diameter||"",length:e.length||"",surgery_date:e.surgery_date||"",healing_months:e.healing_months!=null?String(e.healing_months):"",opg_reminder_date:e.opg_reminder_date||"",total_cost:e.total_cost!=null?String(e.total_cost):"",paid_amount:e.paid_amount!=null?String(e.paid_amount):"",warranty_years:e.warranty_years!=null?String(e.warranty_years):"",torque_ncm:e.torque_ncm!=null?String(e.torque_ncm):"",isq_value:e.isq_value!=null?String(e.isq_value):"",lot_number:e.lot_number||"",serial_number:e.serial_number||"",bone_density:e.bone_density||"",abutment_type:e.abutment_type||"",crown_material:e.crown_material||"",notes:e.notes||"",surgery_fee_mode:e.surgery_fee_mode||"formula",surgery_fee_amount:e.surgery_fee_amount!=null?String(e.surgery_fee_amount):"",prosthesis_doctor_id:e.prosthesis_doctor_id||"",prosthesis_fee_amount:e.prosthesis_fee_amount!=null?String(e.prosthesis_fee_amount):""}),V(0),E(!0)},ht=e=>{j.tap(),s({type:"status",title:"غیرفعال کردن کامپوننت",warning:"اگر این هزینه در محاسبه‌ی سهم جراح لحاظ می‌شد، بعد از حذف دوباره محاسبه می‌شود",fields:[{label:"نوع",value:Ce(e.component_type),highlight:!0},{label:"هزینه",value:e.cost!=null?`${S(e.cost)} ت`:"-"}],confirmLabel:"غیرفعال کن",onConfirm:async()=>{try{await Dt(e.id),v.playPop(),_("success","کامپوننت غیرفعال شد"),await B()}catch{v.playWarning(),_("error","خطا در غیرفعال‌سازی")}}})},_t=e=>{var y;j.tap();const l=ca(e),n=l.surgeryShare,m=((y=e.doctor)==null?void 0:y.name)||"پزشک جراح";s({type:"create",title:"ثبت تسویه دستمزد جراحی",fields:[{label:"بیمار",value:K(e),highlight:!0},{label:"جراح",value:`دکتر ${m}`},{label:"روش محاسبه",value:e.surgery_fee_mode==="negotiated"?"توافقی":"فرمول خودکار"},{label:"مبلغ",value:`${S(n)} ت`,highlight:!0},{label:"سهم پروتز",value:`${S(l.prosthesisShare)} ت`},{label:"سهم کلینیک",value:`${S(l.clinicShare)} ت`},{label:"مانده بیمار",value:`${S(l.remaining)} ت`,highlight:l.remaining>0}],confirmLabel:"ثبت پرداخت",onConfirm:async()=>{try{await Ee({clinic_id:Ke,category:"دستمزد جراحی ایمپلنت",amount:n,date:new Date().toISOString().slice(0,10),payment_method:"cash",description:`دستمزد جراحی ایمپلنت — ${K(e)} — دکتر ${m}`}),await Z(e.id,{surgery_settled:!0}),v.playSuccess(),_("success","تسویه ثبت شد و در هزینه‌های کلینیک لحاظ شد"),await B()}catch{v.playWarning(),_("error","خطا در ثبت تسویه")}}})},ft=e=>{var m;j.tap();const l=e.prosthesis_fee_amount||0,n=((m=C.find(y=>y.id===e.prosthesis_doctor_id))==null?void 0:m.name)||"پزشک پروتز";s({type:"create",title:"ثبت تسویه دستمزد پروتز",fields:[{label:"بیمار",value:K(e),highlight:!0},{label:"پروتزکار",value:`دکتر ${n}`},{label:"مبلغ توافقی",value:`${S(l)} ت`,highlight:!0}],confirmLabel:"ثبت پرداخت",onConfirm:async()=>{try{await Ee({clinic_id:Ke,category:"دستمزد پروتز ایمپلنت",amount:l,date:new Date().toISOString().slice(0,10),payment_method:"cash",description:`دستمزد پروتز ایمپلنت — ${K(e)} — دکتر ${n}`}),await Z(e.id,{prosthesis_settled:!0}),v.playSuccess(),_("success","تسویه ثبت شد و در هزینه‌های کلینیک لحاظ شد"),await B()}catch{v.playWarning(),_("error","خطا در ثبت تسویه")}}})},yt=()=>{if(!a.patient_id){v.playWarning(),_("error","انتخاب بیمار الزامی است");return}if(!a.tooth_number.trim()){v.playWarning(),_("error","شماره دندان الزامی است");return}const e={patient_id:a.patient_id,doctor_id:a.doctor_id||null,tooth_number:a.tooth_number,brand:a.brand==="other"?a.custom_brand.trim()||"سایر":a.brand||null,model:a.model||null,diameter:a.diameter||null,length:a.length||null,surgery_date:a.surgery_date||null,healing_months:a.healing_months?Number(a.healing_months):null,opg_reminder_date:a.opg_reminder_date||null,total_cost:a.total_cost?Number(a.total_cost):null,paid_amount:a.paid_amount?Number(a.paid_amount):null,warranty_years:a.warranty_years?Number(a.warranty_years):null,torque_ncm:a.torque_ncm?Number(a.torque_ncm):null,isq_value:a.isq_value?Number(a.isq_value):null,lot_number:a.lot_number.trim()||null,serial_number:a.serial_number.trim()||null,bone_density:a.bone_density||null,abutment_type:a.abutment_type.trim()||null,crown_material:a.crown_material.trim()||null,notes:a.notes||null,surgery_fee_mode:a.surgery_fee_mode,surgery_fee_amount:a.surgery_fee_mode==="negotiated"&&a.surgery_fee_amount?Number(a.surgery_fee_amount):null,prosthesis_doctor_id:a.prosthesis_doctor_id||null,prosthesis_fee_amount:a.prosthesis_fee_amount?Number(a.prosthesis_fee_amount):null,stage:(x==null?void 0:x.stage)||"planned",success_status:(x==null?void 0:x.success_status)||"pending",healing_abutment_date:(x==null?void 0:x.healing_abutment_date)||null,impression_date:(x==null?void 0:x.impression_date)||null,crown_delivery_date:(x==null?void 0:x.crown_delivery_date)||null,failure_reason:(x==null?void 0:x.failure_reason)||null},l=ua(e);if(l.length){v.playWarning(),_("error",l[0]);return}const n=$.find(m=>m.id===a.patient_id);s({type:x?"edit":"create",title:x?"ویرایش مورد ایمپلنت":"ایجاد مورد ایمپلنت",fields:[{label:"بیمار",value:n?`${n.first_name} ${n.last_name}`:"-",highlight:!0},{label:"دندان",value:a.tooth_number?U(a.tooth_number):"-"},{label:"برند",value:ke(a.brand)},{label:"کل هزینه",value:a.total_cost?`${S(Number(a.total_cost))} ت`:"-"},{label:"دستمزد جراح",value:a.surgery_fee_mode==="negotiated"?`توافقی — ${a.surgery_fee_amount?S(Number(a.surgery_fee_amount)):"0"} ت`:"فرمول خودکار"}],confirmLabel:x?"ذخیره":"ایجاد",onConfirm:async()=>{Te(!0);try{let m;x?(await Z(x.id,e),m=x.id):m=(await qt(e)).id,await bt(m),v.playSuccess(),_("success",x?"ویرایش شد":"ایجاد شد"),E(!1),await B()}catch{v.playWarning(),_("error","خطا در ذخیره")}finally{Te(!1)}}})},vt=e=>{ot(e),Me(0),T({component_type:"fixture",brand:"",model:"",serial_number:"",cost:"",placed_date:"",notes:"",include_in_doctor_share:!0,inventory_item_id:""}),he(!0)},jt=()=>{if(Pe){if(!c.brand.trim()&&!c.model.trim()){_("error","برند یا مدل الزامی است");return}s({type:"create",title:"افزودن کامپوننت",fields:[{label:"نوع",value:Ce(c.component_type),highlight:!0},{label:"برند",value:c.brand||"-"},{label:"مدل",value:c.model||"-"}],confirmLabel:"افزودن",onConfirm:async()=>{De(!0);try{await zt({implant_case_id:Pe,component_type:c.component_type,brand:c.brand||null,model:c.model||null,serial_number:c.serial_number||null,cost:c.cost?Number(c.cost):null,placed_date:c.placed_date||null,notes:c.notes||null,include_in_doctor_share:c.component_type==="fixture"?!1:c.include_in_doctor_share,inventory_item_id:c.inventory_item_id||null}),_("success",c.inventory_item_id?"کامپوننت اضافه شد و از موجودی انبار کسر شد":"کامپوننت اضافه شد"),he(!1),await B()}catch{_("error","خطا")}finally{De(!1)}}})}},Nt=e=>{const l=new Date().toISOString().slice(0,10),n=Ot(e,l),m=Lt(e,l).kind==="late",y=At(e,l),P=n.filter(h=>h.done).length;return t.jsxs("div",{className:"mt-3",children:[t.jsx("div",{dir:"ltr",className:"flex items-center gap-1 mb-1.5",children:n.map(h=>t.jsx("div",{title:h.label+(h.date?` — ${me(h.date)}`:""),className:"flex-1 h-1.5 rounded-full",style:{backgroundColor:h.done?m?"#dc2626":Ge[h.key]:"rgb(226 232 240)"}},h.key))}),t.jsxs("div",{className:"flex items-center justify-between gap-2",children:[t.jsxs("span",{className:"text-[11px] text-slate-500",children:[P?n.filter(h=>h.done).slice(-1)[0].label:"هنوز شروع نشده",t.jsxs("span",{className:"text-slate-400",children:[" · ",w(P),"/",w(n.length)]})]}),y&&(y.key==="wait"||y.key==="surgery"?t.jsx("span",{className:"text-[11px] text-violet-700 font-medium",children:y.label}):t.jsxs("button",{type:"button",onClick:()=>xt(e,y.key),style:{backgroundColor:Ge[y.key]??"#0f766e"},className:"text-[11px] font-bold text-white px-3 py-1.5 rounded-lg flex items-center gap-1 press-scale shadow-sm",children:[y.label," ",t.jsx(la,{size:12})]}))]}),e.lab_order_id&&(()=>{const h=ct.find(i=>i.id===e.lab_order_id);if(!h)return null;const D=Bt(h).filter(i=>i.done),R=Rt(h);return t.jsxs("div",{className:"mt-2 px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-[11px] flex items-center justify-between gap-2",children:[t.jsxs("span",{className:"text-emerald-800 dark:text-emerald-300",children:["لابراتوار: ",D.length?D[D.length-1].label:"ثبت شده"]}),R&&t.jsx("span",{className:"text-emerald-700 font-bold",children:R.label})]})})(),(()=>{const h=_a(e.total_cost,ye.filter(R=>R.implant_case_id===e.id)),D=Number(e.paid_amount||0);return h<=0?null:t.jsx("div",{className:"mt-2",children:t.jsx(na,{patientId:e.patient_id,balance:{balance:h-D,paid:D,totalCost:h},variant:"compact"})})})()]})};return F?t.jsx("div",{className:"flex items-center justify-center py-20",children:t.jsx($t,{size:32})}):t.jsxs("div",{className:"space-y-6",children:[t.jsx(xa,{moduleKey:"implants",title:"ایمپلنت‌ها",subtitle:"مدیریت موارد ایمپلنت دندانی",action:t.jsxs(ce,{onClick:Le,variant:"primary",children:[t.jsx(He,{size:16,className:"inline ml-1"})," مورد جدید"]})}),t.jsx(ga,{storageKey:"implants",className:"grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3",items:[{key:"total",node:t.jsx(X,{moduleKey:"implants",icon:t.jsx(Ne,{size:20}),label:"کل موارد",value:ue(Q.total)})},{key:"surgery",node:t.jsx(X,{moduleKey:"implants",icon:t.jsx(Wt,{size:20}),label:"در جراحی",value:ue(Q.inSurgery)})},{key:"healing",node:t.jsx(X,{moduleKey:"implants",icon:t.jsx(Ht,{size:20}),label:"در حال بهبود",value:ue(Q.healing)})},{key:"completed",node:t.jsx(X,{moduleKey:"implants",icon:t.jsx(Ut,{size:20}),label:"تکمیل شده",value:ue(Q.completed)})},{key:"success",node:t.jsx(X,{moduleKey:"implants",icon:t.jsx(Ue,{size:20}),label:"نرخ موفقیت",value:`${w(Math.round(Q.successRate))}٪`})},{key:"value",node:t.jsx(X,{moduleKey:"implants",icon:t.jsx(Se,{size:20}),label:"ارزش کل",value:`${S(Q.totalValue)} ت`})}]}),t.jsx(je,{className:"p-4",children:t.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[t.jsxs("div",{className:"relative flex-1 min-w-[200px]",children:[t.jsx(Vt,{size:16,className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"}),t.jsx("input",{value:u,onChange:e=>g(e.target.value),placeholder:"جستجوی بیمار یا شماره دندان...",className:"w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"})]}),t.jsxs("select",{value:G,onChange:e=>ne(e.target.value),className:"px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400",children:[t.jsx("option",{value:"",children:"همه مراحل"}),Ie.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))]}),t.jsxs("select",{value:W,onChange:e=>re(e.target.value),className:"px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400",children:[t.jsx("option",{value:"",children:"همه برندها"}),Y.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))]}),t.jsxs("select",{value:H,onChange:e=>oe(e.target.value),className:"px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400",children:[t.jsx("option",{value:"",children:"همه وضعیت‌ها"}),$e.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))]}),(u||G||W||H)&&t.jsx(ce,{variant:"ghost",size:"sm",onClick:()=>{g(""),ne(""),re(""),oe("")},children:"پاک کردن"})]})}),Oe.length===0?t.jsx(je,{className:"p-5",children:t.jsx(Tt,{icon:t.jsx(Ne,{size:28}),title:"مورد ایمپلنتی ثبت نشده است",description:"با ایجاد مورد جدید شروع کنید",action:t.jsxs(ce,{onClick:Le,variant:"primary",size:"sm",children:[t.jsx(He,{size:14,className:"inline ml-1"}),"ایجاد مورد"]})})}):t.jsx("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-5",children:Oe.map(e=>{var P,h,D,R;const l=$a(ve(e,new Date().toISOString().slice(0,10))),n=Ta(e.success_status),m=(e.total_cost||0)-(e.paid_amount||0),y=((P=e.components)==null?void 0:P.length)||0;return t.jsxs(je,{className:"p-5 hover:card-shadow-lg transition-all-smooth",children:[t.jsxs("div",{className:"flex items-start justify-between mb-3",children:[t.jsxs("div",{className:"flex items-center gap-3",children:[t.jsx("div",{className:"w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700",children:t.jsx(Ne,{size:24})}),t.jsxs("div",{children:[t.jsxs("div",{className:"flex items-center gap-1.5 flex-wrap",children:[t.jsx("button",{type:"button",onClick:i=>{i.stopPropagation(),j.tap(),e.patient_id&&d(`/patients/${e.patient_id}`,{state:{initialTab:"treatments"}})},className:"font-bold text-slate-800 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline cursor-pointer",title:"مشاهده پرونده کامل بیمار",children:K(e)}),((h=e.patient)==null?void 0:h.file_number)&&t.jsx("button",{type:"button",onClick:i=>{i.stopPropagation(),j.tap(),e.patient_id&&d(`/patients/${e.patient_id}`)},title:"شماره پرونده بیمار",className:"inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-900 dark:bg-primary-950 text-white dark:text-primary-300 text-[10px] font-mono font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer",dir:"ltr",children:t.jsx("span",{children:w(e.patient.file_number)})})]}),t.jsxs("p",{className:"text-xs text-slate-500",children:["دندان: ",e.tooth_number?t.jsx("button",{type:"button",onClick:i=>{i.stopPropagation(),j.tap(),e.patient_id&&d(`/patients/${e.patient_id}`,{state:{initialTab:"teeth"}})},className:"font-bold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer",title:"مشاهده چارت دندانی در پرونده بیمار",children:U(e.tooth_number)}):"-",e.doctor&&` | پزشک: ${mt(e)}`]})]})]}),t.jsxs("div",{className:"flex flex-col items-end gap-1",children:[t.jsx(le,{color:l.color,children:l.label}),t.jsx(le,{color:n.color,children:n.label})]})]}),t.jsxs("div",{className:"grid grid-cols-2 gap-2 text-xs mb-3",children:[t.jsxs("div",{className:"bg-slate-50 rounded-lg p-2",children:[t.jsx("span",{className:"text-slate-400",children:"برند: "}),t.jsx("span",{className:"text-slate-700 font-medium",children:ke(e.brand)})]}),t.jsxs("div",{className:"bg-slate-50 rounded-lg p-2",children:[t.jsx("span",{className:"text-slate-400",children:"مدل: "}),t.jsx("span",{className:"text-slate-700 font-medium",children:e.model||"-"})]}),e.diameter&&t.jsxs("div",{className:"bg-slate-50 rounded-lg p-2",children:[t.jsx("span",{className:"text-slate-400",children:"قطر: "}),t.jsxs("span",{className:"text-slate-700 font-medium",children:[w(e.diameter)," mm"]})]}),e.length&&t.jsxs("div",{className:"bg-slate-50 rounded-lg p-2",children:[t.jsx("span",{className:"text-slate-400",children:"طول: "}),t.jsxs("span",{className:"text-slate-700 font-medium",children:[w(e.length)," mm"]})]}),e.torque_ncm!=null&&t.jsxs("div",{className:"bg-teal-50/70 rounded-lg p-2 border border-teal-100/60",children:[t.jsx("span",{className:"text-teal-600 text-[11px]",children:"تورک: "}),t.jsxs("span",{className:"text-teal-800 font-bold",children:[w(e.torque_ncm)," N.cm"]})]}),e.isq_value!=null&&t.jsxs("div",{className:"bg-teal-50/70 rounded-lg p-2 border border-teal-100/60",children:[t.jsx("span",{className:"text-teal-600 text-[11px]",children:"ISQ: "}),t.jsx("span",{className:"text-teal-800 font-bold",children:w(e.isq_value)})]})]}),t.jsxs("div",{className:"flex flex-wrap items-center gap-2 text-xs mb-2",children:[e.surgery_date&&t.jsxs("span",{className:"flex items-center gap-1 text-slate-500",children:[t.jsx(Qt,{size:12}),"جراحی: ",Mt(e.surgery_date),e.surgery_date>=new Date().toISOString().slice(0,10)&&t.jsx("button",{onClick:()=>ia({title:`جراحی ایمپلنت — ${K(e)}`,description:`دندان ${e.tooth_number?U(e.tooth_number):"-"}`,dueDate:e.surgery_date,filename:`implant-surgery-reminder-${e.id}.ics`}),"aria-label":"افزودن یادآوری به تقویم گوشی",title:"افزودن یادآوری به تقویم گوشی",className:"p-0.5 rounded hover:bg-black/5",children:t.jsx(Zt,{size:12})})]}),ye.filter(i=>i.implant_case_id===e.id&&i.is_active!==!1).map(i=>t.jsxs(le,{color:ee(i.kind).group==="fee"?"primary":ee(i.kind).group==="prosthetic"?"secondary":"warning",children:[et(i),i.unit_price>0?` — ${S(be(i))} ت`:""]},i.id)),e.prosthesis_doctor_id&&e.prosthesis_doctor_id!==e.doctor_id&&t.jsxs(le,{color:"secondary",children:["پروتز: دکتر ",((D=C.find(i=>i.id===e.prosthesis_doctor_id))==null?void 0:D.name)||"؟"]})]}),Nt(e),t.jsxs("div",{className:"grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800",children:[t.jsxs("button",{type:"button",onClick:i=>{i.stopPropagation(),j.tap(),e.patient_id&&d(`/patients/${e.patient_id}`,{state:{initialTab:"treatments"}})},className:"text-right p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group",title:"مشاهده درمان‌ها در پرونده بیمار",children:[t.jsx("p",{className:"text-xs text-slate-400 group-hover:text-primary-600",children:"کل هزینه"}),t.jsxs("p",{className:"text-sm font-bold text-slate-700 dark:text-slate-200",children:[S(e.total_cost||0)," ت"]})]}),t.jsxs("button",{type:"button",onClick:i=>{i.stopPropagation(),j.tap(),e.patient_id&&d(`/patients/${e.patient_id}`,{state:{initialTab:"payments",focusSection:"section-payments-ledger"}})},className:"text-right p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer group",title:"مشاهده صورت‌حساب پرداختی‌ها در پرونده بیمار",children:[t.jsx("p",{className:"text-xs text-slate-400 group-hover:text-emerald-600",children:"پرداختی"}),t.jsxs("p",{className:"text-sm font-bold text-success-600",children:[S(e.paid_amount||0)," ت"]})]}),t.jsxs("button",{type:"button",onClick:i=>{i.stopPropagation(),j.tap(),e.patient_id&&d(`/patients/${e.patient_id}`,{state:{initialTab:"payments",openPaymentModal:m>0,focusSection:"section-settlement"}})},className:"text-right p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer group",title:m>0?"تسویه حساب مستقیم این مانده در پرونده":"وضعیت تسویه",children:[t.jsx("p",{className:"text-xs text-slate-400 group-hover:text-error-600",children:"باقی‌مانده"}),t.jsxs("p",{className:`text-sm font-bold ${m>0?"text-error-600 underline":"text-slate-600"}`,children:[S(m)," ت"]})]})]}),e.warranty_years!=null&&e.warranty_years>0&&t.jsxs("div",{className:"flex items-center gap-1 text-xs text-slate-500 mt-2",children:[t.jsx(Ue,{size:12,className:"text-success-600"}),"گارانتی: ",w(e.warranty_years)," سال"]}),y>0&&t.jsxs("div",{className:"mt-3 pt-3 border-t border-slate-100",children:[t.jsxs("p",{className:"text-xs text-slate-500 mb-2 flex items-center gap-1",children:[t.jsx(Xt,{size:12}),"کامپوننت‌ها (",w(y),"):"]}),t.jsx("div",{className:"flex flex-col gap-1.5",children:(R=e.components)==null?void 0:R.map(i=>t.jsxs("div",{className:"flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50",children:[t.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[t.jsx(le,{color:"secondary",children:Ce(i.component_type)}),i.cost!=null&&t.jsxs("span",{className:"text-[11px] text-slate-500 dark:text-slate-400 shrink-0",children:[S(i.cost)," ت"]}),i.brand&&t.jsx("span",{className:"text-[11px] text-slate-400 truncate",children:i.brand})]}),t.jsx("button",{onClick:()=>ht(i),"aria-label":"غیرفعال کردن کامپوننت",className:"shrink-0 p-1 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50 transition-colors",children:t.jsx(Jt,{size:12})})]},i.id))})]}),e.notes&&t.jsx("p",{className:"text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50 line-clamp-2",children:e.notes}),t.jsxs("div",{className:"flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100",children:[t.jsxs("button",{onClick:()=>vt(e.id),className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-50 text-accent-700 text-xs hover:bg-accent-100 transition-all-smooth",children:[t.jsx(Yt,{size:12}),"افزودن کامپوننت"]}),t.jsxs("button",{onClick:()=>_t(e),disabled:!!e.surgery_settled,className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success-50 text-success-700 text-xs hover:bg-success-100 transition-all-smooth disabled:opacity-50",children:[t.jsx(Se,{size:12}),e.surgery_settled?"جراحی تسویه شده":"ثبت تسویه جراحی"]}),e.prosthesis_doctor_id&&t.jsxs("button",{onClick:()=>ft(e),disabled:!!e.prosthesis_settled,className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary-50 text-secondary-700 text-xs hover:bg-secondary-100 transition-all-smooth disabled:opacity-50",children:[t.jsx(Se,{size:12}),e.prosthesis_settled?"پروتز تسویه شده":"ثبت تسویه پروتز"]}),(()=>{var de;const i=(de=e.patient)!=null&&de.phone?e.patient.phone.replace(/\D/g,"").replace(/^0/,"98"):null;if(!i)return null;const ae=`سلام ${K(e)} عزیز،
پیگیری درمان ایمپلنت دندان ${e.tooth_number?U(e.tooth_number):"-"} شما در کلینیک دندانپزشکی مینا:
مرحله جاری: ${l.label}
برند پایه ایمپلنت: ${ke(e.brand)}
جهت هماهنگی مراحل بعدی درمان با ما در ارتباط باشید.`;return t.jsxs("a",{href:`https://wa.me/${i}?text=${encodeURIComponent(ae)}`,target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs hover:bg-emerald-100 transition-all-smooth press-scale",title:"ارسال گزارش وضعیت ایمپلنت در واتساپ",onClick:()=>v.playPop(),children:[t.jsx(ea,{size:12}),"واتساپ"]})})(),t.jsxs("button",{type:"button",onClick:()=>{v.playSuccess(),j.select();const i=$.find(se=>se.id===e.patient_id);if(!i){_("error","اطلاعات بیمار یافت نشد");return}const ae=C.find(se=>se.id===e.doctor_id),de=C.find(se=>se.id===e.prosthesis_doctor_id);Ia({implantCase:e,patient:i,doctor:ae,prosthesisDoctor:de})},className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-all-smooth press-scale border border-teal-200",title:"صدور و چاپ شناسنامه رسمی ایمپلنت (پروتکل ITI)",children:[t.jsx(Ve,{size:12,className:"text-teal-600"}),"شناسنامه"]}),t.jsxs("button",{onClick:()=>Ae(e),className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs hover:bg-primary-100 transition-all-smooth",children:[t.jsx(ta,{size:12}),"ویرایش"]}),t.jsxs("button",{onClick:()=>{j.warning(),s({type:"status",title:"آرشیو مورد ایمپلنت",warning:"این مورد هیچ‌وقت پاک نمی‌شود — فقط از لیست فعال مخفی می‌شود و از بخش «بایگانی» قابل بازگردانی است.",fields:[{label:"بیمار",value:K(e),highlight:!0},{label:"دندان",value:e.tooth_number?U(e.tooth_number):"-"}],confirmLabel:"تایید آرشیو",onConfirm:async()=>{try{await Z(e.id,{is_active:!1}),v.playPop(),_("success","آرشیو شد — سوابق حفظ شد"),await B()}catch{v.playWarning(),_("error","خطا در آرشیو کردن")}}})},className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error-50 text-error-600 text-xs hover:bg-error-100 transition-all-smooth",children:[t.jsx(aa,{size:12}),"آرشیو"]}),t.jsxs("button",{onClick:()=>d(`/patients/${e.patient_id}`),className:"flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs hover:bg-slate-100 transition-all-smooth mr-auto",children:[t.jsx(sa,{size:12}),"پرونده"]})]})]},e.id)})}),t.jsx(Re,{open:xe,onClose:()=>{j.cancel(),E(!1)},title:x?"ویرایش مورد ایمپلنت":"ایجاد مورد ایمپلنت جدید",step:ge,onStepChange:V,onFinish:yt,finishLabel:x?"ذخیره تغییرات":"ایجاد مورد",saving:at,steps:[{label:"بیمار و دندان",validate:()=>a.patient_id?a.tooth_number.trim()?null:"شماره دندان الزامی است":"انتخاب بیمار الزامی است",content:t.jsxs(t.Fragment,{children:[t.jsx(ra,{required:!0,value:a.patient_id,onChange:e=>p({...a,patient_id:e}),patients:$}),a.patient_id&&t.jsx("div",{className:"my-2",children:t.jsx(oa,{patient:$.find(e=>e.id===a.patient_id)||null,balance:null})}),C.filter(e=>e.is_active).length===0?t.jsxs("div",{className:"p-4 rounded-2xl bg-warning-50 border border-warning-200 text-center",children:[t.jsx("p",{className:"text-sm font-bold text-warning-700 mb-1",children:"هنوز پزشکی ثبت نشده است"}),t.jsx("p",{className:"text-xs text-warning-600 mb-3",children:"برای ثبت مورد ایمپلنت، اول باید حداقل یک پزشک اضافه کنید."}),t.jsx(ce,{variant:"secondary",size:"sm",onClick:()=>{E(!1),d("/staff")},children:"رفتن به پرسنل"})]}):t.jsx(O,{label:"پزشک",value:a.doctor_id,onChange:e=>p({...a,doctor_id:e}),options:pt,placeholder:"انتخاب پزشک"}),t.jsx(pa,{label:"دندان *",value:a.tooth_number,onChange:e=>p({...a,tooth_number:e}),allowPrimary:!1}),t.jsx(we,{label:"تاریخ جراحی",value:a.surgery_date,onChange:e=>p({...a,surgery_date:e})}),t.jsx(O,{label:"مدت هیلینگ",value:a.healing_months,onChange:e=>{const l=Pt({surgery_date:a.surgery_date||null,healing_months:Number(e)||null}),n=a.opg_reminder_date||ya(l)||"";p({...a,healing_months:e,opg_reminder_date:n})},options:[{value:"2",label:"۲ ماه"},{value:"3",label:"۳ ماه"},{value:"4",label:"۴ ماه"},{value:"6",label:"۶ ماه"}],placeholder:"انتخاب…"}),t.jsx(we,{label:"تاریخ عکس OPG",value:a.opg_reminder_date,onChange:e=>p({...a,opg_reminder_date:e})})]})},{label:"برند و مشخصات",validate:()=>a.brand?a.brand==="other"&&!a.custom_brand.trim()?"نام برند دستی الزامی است":null:"انتخاب برند الزامی است",content:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsx(z,{label:"قطر (mm)",value:a.diameter,onChange:e=>p({...a,diameter:e}),placeholder:"3.5",dir:"ltr"}),t.jsx(z,{label:"طول (mm)",value:a.length,onChange:e=>p({...a,length:e}),placeholder:"10",dir:"ltr"})]}),t.jsx(O,{label:"برند *",value:a.brand,onChange:e=>{let l=a.total_cost;if(!x&&!a.total_cost&&e&&e!=="other"){const n=f.filter(m=>m.brand===e&&m.total_cost);if(n.length>0){const m=Math.round(n.reduce((y,P)=>y+(P.total_cost||0),0)/n.length/1e5)*1e5;l=String(m)}}p({...a,brand:e,model:"",total_cost:l})},options:Y,placeholder:"انتخاب برند"}),a.brand==="other"&&t.jsx(z,{label:"نام برند (دستی)",value:a.custom_brand,onChange:e=>p({...a,custom_brand:e}),placeholder:"مثلاً: برند محلی یا برندی که در لیست نیست"}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5",children:"مدل"}),t.jsx("input",{list:"implant-models-list",value:a.model,onChange:e=>p({...a,model:e.target.value}),placeholder:"انتخاب یا تایپ دستی مدل...",className:"w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base focus:outline-none focus:ring-2 focus:ring-primary-400"}),t.jsx("datalist",{id:"implant-models-list",children:Ma(a.brand).map(e=>t.jsx("option",{value:e},e))})]})]})},{label:"بیومکانیک و ردیابی (ITI)",content:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 rounded-xl space-y-1 text-xs text-teal-800 dark:text-teal-300 mb-2",children:[t.jsxs("p",{className:"font-bold flex items-center gap-1.5",children:[t.jsx(Ve,{size:14,className:"text-teal-600"}),"استاندارد بین‌المللی ITI Consensus & EAO"]}),t.jsx("p",{className:"text-[11px] text-teal-700 dark:text-teal-400",children:"ثبت پارامترهای بیومکانیکی ثبات اولیه و بارکد ردیابی قطعه جهت صدور شناسنامه رسمی ایمپلنت (Passport) و گارانتی بیمار."})]}),t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsx(z,{label:"گشتاور جایگذاری (Torque - N.cm)",type:"number",value:a.torque_ncm,onChange:e=>p({...a,torque_ncm:e}),placeholder:"مثلاً: 35",dir:"ltr"}),t.jsx(z,{label:"ثبات اولیه (ISQ - Ostell)",type:"number",value:a.isq_value,onChange:e=>p({...a,isq_value:e}),placeholder:"مثلاً: 70",dir:"ltr"})]}),t.jsxs("div",{className:"flex items-center justify-between pb-1 mt-1",children:[t.jsx("span",{className:"text-xs font-bold text-slate-700 dark:text-slate-300",children:"ردیابی کارخانه و بارکد بسته فیکسچر"}),t.jsxs("button",{type:"button",onClick:()=>{v.playPop(),j.tap(),fe(!0)},className:"flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-xs font-bold border border-teal-200 dark:border-teal-800 transition-all-smooth press-scale",children:[t.jsx(Qe,{size:14,className:"text-teal-600"}),"اسکن بارکد بسته فیکسچر"]})]}),t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsx(z,{label:"شماره لات / بهر (LOT)",value:a.lot_number,onChange:e=>p({...a,lot_number:e}),placeholder:"مثلاً: LOT-2024-X9",dir:"ltr"}),t.jsx(z,{label:"شماره سریال (Serial No)",value:a.serial_number,onChange:e=>p({...a,serial_number:e}),placeholder:"مثلاً: SN-998241",dir:"ltr"})]}),t.jsx(O,{label:"تراکم استخوان (Misch Bone Density)",value:a.bone_density,onChange:e=>p({...a,bone_density:e}),options:[{value:"",label:"تعیین نشده"},{value:"D1",label:"D1 (استخوان کورتیکال متراکم - فک پایین قدامی)"},{value:"D2",label:"D2 (کورتیکال ضخیم با اسفنجی متراکم)"},{value:"D3",label:"D3 (کورتیکال نازک با اسفنجی متخلخل)"},{value:"D4",label:"D4 (استخوان بسیار نرم / اسفنجی - فک بالا خلفی)"}]}),t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsx(O,{label:"نوع اباتمنت",value:a.abutment_type,onChange:e=>p({...a,abutment_type:e}),options:[{value:"",label:"انتخاب یا نامشخص"},{value:"Custom Ti",label:"تراش اختصاصی تیتانیوم (Custom Ti)"},{value:"Custom Zirconia",label:"تراش اختصاصی زیرکونیا"},{value:"Straight Prefab",label:"پیش‌ساخته مستقیم (Straight)"},{value:"Angled Prefab",label:"پیش‌ساخته زاویه‌دار (Angled)"},{value:"Multi-Unit",label:"مولتی‌یونیت (Multi-Unit)"},{value:"Locator/Ball",label:"لوکیتور / بال اباتمنت"}]}),t.jsx(O,{label:"جنس روکش پروتز",value:a.crown_material,onChange:e=>p({...a,crown_material:e}),options:[{value:"",label:"انتخاب یا نامشخص"},{value:"Zirconia Monolithic",label:"زیرکونیا مونولیتیک (Monolithic)"},{value:"Zirconia Layered",label:"زیرکونیا لیرینگ (Layered)"},{value:"PFM",label:"فلز پرسلن (PFM)"},{value:"E-max",label:"سرامیک شیشه‌ای (IPS E-max)"},{value:"PMMA / Temporary",label:"موقت یا PMMA"}]})]})]})},{label:"هزینه و شرایط",validate:()=>!a.total_cost||Number(a.total_cost)<=0?"قیمت فیکسچر الزامی است":null,content:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[t.jsx(J,{label:"قیمت فیکسچر (ت) *",value:a.total_cost,onChange:e=>p({...a,total_cost:e})}),t.jsx(J,{label:"پرداختی (ت)",value:a.paid_amount,onChange:e=>p({...a,paid_amount:e})}),t.jsx(z,{label:"گارانتی (سال)",type:"number",value:a.warranty_years,onChange:e=>p({...a,warranty_years:e}),placeholder:"5"})]}),t.jsx(wa,{items:qe,onChange:ie,doctors:C,fixturePrice:Number(a.total_cost)||0}),!x&&a.total_cost&&f.some(e=>e.brand===a.brand&&e.total_cost)&&t.jsx("p",{className:"text-[11px] text-slate-400 -mt-2",children:"پیشنهاد خودکار بر اساس میانگین موارد قبلی همین برند در همین کلینیک — قابل تغییر است"})]})},{label:"دستمزد جراحی و پروتز",validate:()=>a.surgery_fee_mode==="negotiated"&&(!a.surgery_fee_amount||Number(a.surgery_fee_amount)<=0)?"مبلغ توافقی دستمزد جراح الزامی است":null,content:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-3",children:[t.jsx("p",{className:"text-xs font-bold text-slate-500 dark:text-slate-400",children:"روش تعیین دستمزد جراح"}),t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsx("button",{type:"button",onClick:()=>p({...a,surgery_fee_mode:"formula"}),className:`p-2.5 rounded-xl border-2 text-sm font-bold transition-all-smooth ${a.surgery_fee_mode==="formula"?"border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300":"border-slate-200 dark:border-slate-600 text-slate-500"}`,children:"فرمول خودکار"}),t.jsx("button",{type:"button",onClick:()=>p({...a,surgery_fee_mode:"negotiated"}),className:`p-2.5 rounded-xl border-2 text-sm font-bold transition-all-smooth ${a.surgery_fee_mode==="negotiated"?"border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300":"border-slate-200 dark:border-slate-600 text-slate-500"}`,children:"مبلغ توافقی"})]}),a.surgery_fee_mode==="formula"?t.jsx("p",{className:"text-xs text-slate-500 dark:text-slate-400 leading-relaxed",children:"سهم جراح = (هزینه‌ی کل − هزینه‌ی اقلامی که تیک «کسر در سهم جراح» خورده‌اند) ÷ ۲. هزینه‌ی فیکسچر همیشه مستقل حساب می‌شود."}):t.jsx(J,{label:"مبلغ توافقی جراح (تومان) *",value:a.surgery_fee_amount,onChange:e=>p({...a,surgery_fee_amount:e})})]}),t.jsxs("div",{className:"p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl",children:[t.jsx(O,{label:"پزشک انجام‌دهنده‌ی پروتز (در صورت متفاوت بودن با جراح)",value:a.prosthesis_doctor_id,onChange:e=>p({...a,prosthesis_doctor_id:e}),options:C.filter(e=>e.is_active).map(e=>({value:e.id,label:`دکتر ${e.name||e.specialty||"پزشک"}`})),placeholder:"همان پزشک جراح"}),t.jsx("p",{className:"text-xs text-slate-400 mt-2",children:"اگر روکش/پروتز را پزشک دیگری کار می‌کند، اینجا انتخاب کنید تا سهم‌بندی هرکدام جدا محاسبه شود."}),a.prosthesis_doctor_id&&t.jsx(J,{label:"دستمزد توافقی پروتزکار (تومان)",value:a.prosthesis_fee_amount,onChange:e=>p({...a,prosthesis_fee_amount:e})})]})]})},{label:"یادداشت",content:t.jsx(Fe,{label:"یادداشت",value:a.notes,onChange:e=>p({...a,notes:e}),placeholder:"توضیحات و یادداشت‌های مورد",rows:3})}]}),t.jsx(Re,{open:st,onClose:()=>{j.cancel(),he(!1)},title:"افزودن کامپوننت ایمپلنت",step:rt,onStepChange:Me,onFinish:jt,finishLabel:"افزودن کامپوننت",saving:it,steps:[{label:"نوع و برند",validate:()=>!c.brand.trim()&&!c.model.trim()?"برند یا مدل الزامی است":null,content:t.jsxs(t.Fragment,{children:[t.jsx(O,{label:"نوع کامپوننت",value:c.component_type,onChange:e=>T({...c,component_type:e}),options:tt}),k.length>0&&t.jsxs("div",{className:"flex items-end gap-2",children:[t.jsx("div",{className:"flex-1",children:t.jsx(O,{label:"کسر از موجودی انبار (اختیاری)",value:c.inventory_item_id,onChange:e=>{const l=k.find(n=>n.id===e);T({...c,inventory_item_id:e,brand:l?l.brand||l.name:c.brand})},options:[{value:"",label:"بدون اتصال به انبار"},...k.map(e=>({value:e.id,label:`${e.name}${e.brand?` — ${e.brand}`:""} (موجودی: ${e.quantity})`}))]})}),t.jsx("button",{type:"button",onClick:()=>{j.tap(),_e(!0)},className:"shrink-0 h-[46px] w-[46px] rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center hover:bg-primary-100 transition-colors","aria-label":"اسکن بارکد فیکسچر",title:"اسکن بارکد فیکسچر",children:t.jsx(Qe,{size:18})})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5",children:"برند کامپوننت"}),t.jsx("input",{list:"component-brands-list",value:c.brand,onChange:e=>T({...c,brand:e.target.value}),placeholder:"انتخاب یا تایپ دستی برند...",className:"w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base focus:outline-none focus:ring-2 focus:ring-primary-400"}),t.jsx("datalist",{id:"component-brands-list",children:Y.map(e=>t.jsx("option",{value:e.label},e.value))})]}),t.jsx(z,{label:"مدل",value:c.model,onChange:e=>T({...c,model:e}),placeholder:"مدل کامپوننت"}),t.jsx("p",{className:"text-xs text-slate-500 dark:text-slate-400",children:"* دست‌کم یکی از «برند کامپوننت» یا «مدل» را وارد کنید."})]})},{label:"سریال و هزینه",content:t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsx(z,{label:"شماره سریال",value:c.serial_number,onChange:e=>T({...c,serial_number:e}),placeholder:"سریال",dir:"ltr"}),t.jsx(J,{label:"هزینه (تومان)",value:c.cost,onChange:e=>T({...c,cost:e})})]}),t.jsx(we,{label:"تاریخ نصب",value:c.placed_date,onChange:e=>T({...c,placed_date:e})}),c.component_type==="fixture"?t.jsx("p",{className:"text-xs text-slate-400 mt-2",children:"هزینه‌ی فیکسچر همیشه از محاسبه‌ی سهم جراح کنار گذاشته می‌شود (جداگانه محاسبه می‌شود)."}):t.jsxs("label",{className:"flex items-center gap-2 mt-3 cursor-pointer",children:[t.jsx("input",{type:"checkbox",checked:c.include_in_doctor_share,onChange:e=>T({...c,include_in_doctor_share:e.target.checked}),className:"w-4 h-4 rounded accent-primary-600"}),t.jsx("span",{className:"text-sm text-slate-600 dark:text-slate-300",children:"هزینه‌ی این قلم در محاسبه‌ی سهم جراح کسر شود"})]})]})},{label:"یادداشت",content:t.jsx(Fe,{label:"یادداشت",value:c.notes,onChange:e=>T({...c,notes:e}),placeholder:"توضیحات اختیاری",rows:3})}]}),lt&&t.jsx(Ze,{onClose:()=>_e(!1),onScan:e=>{_e(!1);const l=k.find(n=>n.barcode===e);l?(T(n=>({...n,inventory_item_id:l.id,brand:l.brand||l.name,serial_number:e})),_("success",`«${l.name}» از انبار پیدا و انتخاب شد`)):(T(n=>({...n,serial_number:e})),_("success","بارکد به‌عنوان شماره سریال ثبت شد — در انبار پیدا نشد"))}}),nt&&t.jsx(Ze,{onClose:()=>fe(!1),onScan:e=>{fe(!1),v.playSuccess(),j.confirm();const l=k.find(n=>n.barcode===e);l?(p(n=>({...n,brand:n.brand||l.brand||"",model:n.model||l.name||"",lot_number:n.lot_number||e,serial_number:n.serial_number||e})),_("success",`فیکسچر «${l.name}» از انبار تطبیق داده و ثبت شد`)):(p(n=>({...n,lot_number:n.lot_number||e,serial_number:n.serial_number?n.serial_number:n.lot_number?e:n.serial_number})),_("success",`بارکد بسته فیکسچر «${e}» در مشخصات ردیابی ثبت شد`))}}),o]})}export{Ya as default};
