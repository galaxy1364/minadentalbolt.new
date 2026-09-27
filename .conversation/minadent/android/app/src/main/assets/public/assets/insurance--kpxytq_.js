import{b as H,e as d}from"./printDocument-N_7D99vH.js";import{g as l,e as n,d as T}from"./index-CGUuXpKJ.js";function S(t){return Math.round(t)}const O=["approved","paid","settled"];function G(t){return O.includes((t||"").toLowerCase())}function U(t,a){return S(t.filter(i=>G(i.status)).filter(i=>a===null||i.company_id===a).reduce((i,c)=>i+(c.approved_amount??c.amount??0),0))}function I(t,a){if(t.ceiling_amount===null)return null;const i=U(a,t.company_id);return Math.max(0,S(t.ceiling_amount-i))}function L(t,a){if(!t.is_active)return!1;const i=a.slice(0,10);return!(t.start_date&&i<t.start_date.slice(0,10)||t.end_date&&i>t.end_date.slice(0,10))}function F(t,a,i){const c=t.filter(x=>L(x,i));return c.length===0?null:c.reduce((x,u)=>{const g=I(x,a),y=I(u,a);return g===null?x:y===null||y>g?u:x})}function J(t,a,i,c,x){const u=Math.max(0,S(t)),g=a.filter(o=>L(o,c)),y=o=>o.tier?o.tier:"supplementary",D=g.filter(o=>y(o)==="primary"),A=g.filter(o=>y(o)==="supplementary");let h=null,p=null;D.length>0&&(h=F(D,i,c)),A.length>0&&(p=F(A,i,c)),!h&&!p&&g.length>0&&(p=F(g,i,c));let s=0,v=!1,$=null;if(h){const o=Math.min(100,Math.max(0,h.coverage_percentage||0)),b=S(u*o/100),f=I(h,i);f===null?(s=b,$=null):f<=0?(s=0,v=!0,$=0):(s=Math.min(b,f),v=s<b,$=Math.max(0,f-s))}const k=Math.max(0,u-s);let m=0,w=0,P=!1,M=null;if(p&&k>0){const o=Math.min(100,Math.max(0,p.coverage_percentage||0)),b=Math.min(100,Math.max(0,p.deductible_percentage||0)),f=S(k*o/100);w=b>0?S(f*b/100):0;const _=Math.max(0,f-w),z=I(p,i);z===null?(m=_,M=null):z<=0?(m=0,P=!0,M=0):(m=Math.min(_,z),P=m<_,M=Math.max(0,z-m))}const e=s+m,r=Math.max(0,u-e),N=[];v&&N.push("سقف تعهد بیمه پایه پر شده است."),P&&N.push("سقف تعهد بیمه تکمیلی تکمیل یا محدود شده است.");const C=[];return s>0&&C.push(`بیمه پایه: ${l(s)} ت`),m>0&&C.push(`بیمه تکمیلی: ${l(m)} ت`),w>0&&C.push(`فرانشیز: ${l(w)} ت`),C.push(`سهم نهایی بیمار: ${l(r)} ت`),{totalCost:u,primaryShare:s,supplementaryShare:m,totalInsuranceShare:e,patientShare:r,franchiseAmount:w,primaryPolicy:h,supplementaryPolicy:p,primaryCapped:v,supplementaryCapped:P,primaryRemainingAfter:$,supplementaryRemainingAfter:M,warning:N.length>0?N.join(" "):null,breakdownSummary:C.join(" | ")}}function V(t){const a=d(t.clinicName||"کلینیک دندانپزشکی مینا"),i=d(t.clinicPhone||"۰۲۱-۸۸۸۸۸۸۸۸"),c=d(t.clinicAddress||"تهران، خیابان ولیعصر"),x=d(t.clinicLicense||"۱۲۳۴۵۶"),u=d(t.patientName||"بیمار گرامی"),g=d(n(t.nationalId||"-")),y=d(t.insuranceCompany||"بیمه‌گر طرف قرارداد"),D=d(t.tierLabel||"بیمه تکمیلی درمان"),A=d(n(t.policyNumber||"-")),h=d(n(t.claimNumber||"CLM-"+Date.now().toString().slice(-6))),p=d(n(t.claimDate?T(t.claimDate):T(new Date().toISOString()))),s=d(t.doctorName?`دکتر ${t.doctorName}`:"دندانپزشک معالج"),v=d(n(t.doctorMedicalCouncilId||"نظام‌پزشکی ثبت‌شده")),$=t.notes?d(t.notes):"",k=t.items.reduce((e,r)=>e+(r.totalFee||0),0),m=t.items.reduce((e,r)=>e+(r.primaryDeduction||0),0),w=t.items.reduce((e,r)=>e+(r.supplementaryClaimed||0),0),P=t.items.reduce((e,r)=>e+(r.patientPaid??Math.max(0,r.totalFee-(r.primaryDeduction||0)-(r.supplementaryClaimed||0))),0),M=t.items.map((e,r)=>{const N=n(r+1),C=e.toothNumber?`دندان ${n(e.toothNumber)}`:"-",o=e.procedureCode?n(e.procedureCode):"-",b=d(e.procedureName),f=e.date?n(T(e.date)):p,_=n(l(e.totalFee)),z=e.primaryDeduction?n(l(e.primaryDeduction)):"۰",R=e.supplementaryClaimed?n(l(e.supplementaryClaimed)):n(l(Math.max(0,e.totalFee-(e.primaryDeduction||0)))),j=e.patientPaid!==void 0&&e.patientPaid!==null?n(l(e.patientPaid)):n(l(Math.max(0,e.totalFee-(e.primaryDeduction||0)-(e.supplementaryClaimed||0))));return`
      <tr>
        <td style="text-align: center; font-weight: bold;">${N}</td>
        <td style="text-align: center; direction: ltr; font-weight: bold;">${C}</td>
        <td style="text-align: center; direction: ltr; font-family: monospace;">${o}</td>
        <td>${b}</td>
        <td style="text-align: center; font-size: 11px;">${f}</td>
        <td style="text-align: left; direction: ltr;">${_} ت</td>
        <td style="text-align: left; direction: ltr; color: #0284c7;">${z} ت</td>
        <td style="text-align: left; direction: ltr; color: #059669; font-weight: bold;">${R} ت</td>
        <td style="text-align: left; direction: ltr;">${j} ت</td>
      </tr>
    `}).join("");return`
    <div class="claim-document" dir="rtl" style="font-family: 'Vazirmatn', system-ui, sans-serif; padding: 24px; max-width: 900px; margin: 0 auto; color: #1e293b;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a;">${a}</h1>
          <p style="margin: 0; font-size: 12px; color: #64748b;">پروانه بهره‌برداری / کد نظام‌پزشکی: ${x} | تلفن: ${i}</p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">نشانی: ${c}</p>
        </div>
        <div style="text-align: left; border-right: 1px solid #e2e8f0; padding-right: 16px;">
          <div style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; margin-bottom: 4px;">
            ${D}
          </div>
          <div style="font-size: 12px; color: #475569;">شماره رهگیری ادعا: <b>${h}</b></div>
          <div style="font-size: 12px; color: #475569;">تاریخ صدور: <b>${p}</b></div>
        </div>
      </div>

      <!-- Title -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e3a8a; background: #f8fafc; border: 1px solid #cbd5e1; display: inline-block; padding: 6px 24px; border-radius: 20px;">
          گواهی تأیید انجام خدمات دندانپزشکی و معرفی‌نامه پرداخت خسارت بیمه
        </h2>
      </div>

      <!-- Patient & Insurance Details Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 13px;">
        <div>نام و نام خانوادگی بیمار: <b>${u}</b></div>
        <div>کد ملی: <b style="font-family: monospace;">${g}</b></div>
        <div>شرکت بیمه‌گر: <b style="color: #0369a1;">${y}</b></div>
        <div>شماره بیمه‌نامه / پرسنلی: <b>${A}</b></div>
        <div>پزشک معالج: <b>${s}</b></div>
        <div>شماره نظام پزشکی: <b>${v}</b></div>
      </div>

      <!-- Table of Procedures -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8; color: #334155;">
            <th style="padding: 8px; text-align: center; width: 35px;">ردیف</th>
            <th style="padding: 8px; text-align: center; width: 65px;">شماره دندان</th>
            <th style="padding: 8px; text-align: center; width: 60px;">کد رویه</th>
            <th style="padding: 8px; text-align: right;">شرح خدمات تشخیصی و درمانی</th>
            <th style="padding: 8px; text-align: center; width: 75px;">تاریخ</th>
            <th style="padding: 8px; text-align: left; width: 85px;">تعرفه کل</th>
            <th style="padding: 8px; text-align: left; width: 85px;">سهم پایه</th>
            <th style="padding: 8px; text-align: left; width: 95px;">سهم بیمه مکمل</th>
            <th style="padding: 8px; text-align: left; width: 85px;">سهم بیمار</th>
          </tr>
        </thead>
        <tbody style="border-bottom: 2px solid #cbd5e1;">
          ${M}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #94a3b8; color: #0f172a;">
            <td colspan="5" style="padding: 10px; text-align: right;">جمع کل خدمات صورت‌گرفته:</td>
            <td style="padding: 10px; text-align: left; direction: ltr;">${n(l(k))} ت</td>
            <td style="padding: 10px; text-align: left; direction: ltr; color: #0284c7;">${n(l(m))} ت</td>
            <td style="padding: 10px; text-align: left; direction: ltr; color: #059669;">${n(l(w))} ت</td>
            <td style="padding: 10px; text-align: left; direction: ltr;">${n(l(P))} ت</td>
          </tr>
        </tfoot>
      </table>

      <!-- Attestation Paragraph -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 24px; font-size: 12px; line-height: 1.8; color: #166534;">
        <b>گواهی دندانپزشک:</b>
        بدین‌وسیله گواهی می‌شود کلیه خدمات تشخیصی و درمانی فوق با مشخصات و تعرفه مصوب قانونی جهت بیمار محترم در این مرکز با موفقیت انجام پذیرفته و مدارک کلینیکی (گرافی‌ها و پرونده) موجود می‌باشد. خواهشمند است وفق ضوابط قرارداد، اقدامات لازم جهت پرداخت و تسویه سهم بیمه مبذول فرمایید.
        ${$?`<br /><b>توضیحات تکمیلی:</b> ${$}`:""}
      </div>

      <!-- Signatures Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 30px; font-size: 12px;">
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; min-height: 100px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #475569;">امضای بیمار / بیمه‌شده</div>
          <div style="font-size: 11px; color: #94a3b8;">تأیید دریافت خدمات مندرج</div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; min-height: 100px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #475569;">امضا و مهر دندانپزشک معالج</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: bold;">${s}</div>
          <div style="font-size: 10px; color: #64748b;">نظام پزشکی: ${v}</div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; min-height: 100px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #475569;">مهر و امضای حسابداری کلینیک</div>
          <div style="font-size: 11px; color: #94a3b8;">تأیید امور مالی و تعرفه‌ها</div>
        </div>
      </div>
    </div>
  `}function q(t){const a=V(t);return H({title:`گواهی بیمه - ${t.patientName}`,styles:`
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        body { background: #fff !important; }
        .claim-document { padding: 0 !important; max-width: 100% !important; }
      }
    `,bodyHtml:a,shareText:`گواهی خدمات دندانپزشکی جهت بیمه ${t.insuranceCompany} - بیمار: ${t.patientName}`})}export{q as g,J as s};
