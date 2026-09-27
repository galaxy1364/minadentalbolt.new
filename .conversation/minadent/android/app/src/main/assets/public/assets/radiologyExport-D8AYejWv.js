import{d as f,t as u,e as o}from"./index-CGUuXpKJ.js";function l(e){return e?e.split(/[,،\s]+/).map(t=>t.trim()).filter(t=>t.length>0):[]}function b(e,t="all"){return t==="all"?!0:e?l(e).includes(String(t)):!1}function h(e){const{patient:t,images:a,clinicName:r="Mina Dental Clinic"}=e;return{ExportVersion:"1.0",ExportDate:new Date().toISOString(),InstitutionName:r,Modality:"DX",BodyPartExamined:"TEETH",PatientID:t.file_number||t.id,PatientName:`${t.first_name} ${t.last_name}`,PatientNationalID:t.national_id||void 0,PatientBirthDate:t.birth_date||void 0,PatientGender:t.gender||void 0,TotalImages:a.length,Studies:a.map((i,s)=>({Index:s+1,ImageID:i.id,ImageType:i.image_type||"Dental Radiograph",Teeth:l(i.tooth_number),ExposureDate:i.taken_at||i.created_at,Description:i.description||void 0,FileUrl:i.image_url}))}}function y(e){const{patient:t,images:a,clinicName:r="کلینیک دندانپزشکی مینا"}=e,d=`${t.first_name} ${t.last_name}`,i=f(new Date().toISOString()),s=a.map((n,g)=>{const p=l(n.tooth_number),c=p.length>0?p.map(x=>u(x)).join("، "):"مشخص نشده",m=n.taken_at?f(n.taken_at):"-";return`
        <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: #ffffff; break-inside: avoid; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="font-weight: bold; font-size: 13px; color: #0f172a;">تصویر #${o(g+1)} — ${n.image_type||"رادیولوژی"}</span>
            <span style="font-size: 11px; color: #64748b;">تاریخ: ${m}</span>
          </div>
          <div style="width: 100%; height: 220px; border-radius: 8px; overflow: hidden; background: #000000; display: flex; align-items: center; justify-content: center;">
            ${n.image_url?`<img src="${n.image_url}" alt="${n.description||"گرافی"}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`:'<span style="color: #94a3b8; font-size: 12px;">بدون فایل تصویری</span>'}
          </div>
          <div style="font-size: 12px; color: #334155; line-height: 1.8;">
            <div><strong>دندان‌های مرتبط:</strong> ${c}</div>
            ${n.description?`<div><strong>یادداشت و یافته‌های تشخیصی:</strong> ${n.description}</div>`:""}
          </div>
        </div>
      `}).join("");return`
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="utf-8" />
      <title>آرشیو گرافی و رادیولوژی — ${d}</title>
      <style>
        body {
          font-family: Tahoma, 'Vazirmatn', sans-serif;
          margin: 0;
          padding: 24px;
          background: #f8fafc;
          color: #0f172a;
        }
        @media print {
          body { background: #ffffff; padding: 0; }
          .no-print { display: none !important; }
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0d9488;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 20px;
          font-weight: bold;
          color: #0d9488;
        }
        .patient-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          font-size: 13px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .grid { grid-template-columns: 1fr; }
          .patient-card { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">شناسنامه و آرشیو رادیولوژی دندانپزشکی</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${r}</div>
        </div>
        <div style="text-align: left; font-size: 12px; color: #64748b;">
          تاریخ صدور: ${i}
        </div>
      </div>

      <div class="patient-card">
        <div><strong>نام و نام خانوادگی:</strong> ${d}</div>
        <div><strong>شماره پرونده:</strong> ${t.file_number?o(t.file_number):"-"}</div>
        <div><strong>کد ملی:</strong> ${t.national_id?o(t.national_id):"-"}</div>
        <div><strong>تلفن تماس:</strong> ${t.phone?o(t.phone):"-"}</div>
        <div><strong>تعداد کل گرافی‌ها:</strong> ${o(a.length)} مورد</div>
        <div><strong>وضعیت پرونده:</strong> فعال</div>
      </div>

      <div class="grid">
        ${s}
      </div>

      <div style="margin-top: 32px; padding: 14px; background: #f1f5f9; border-radius: 8px; font-size: 11px; color: #475569; text-align: justify; line-height: 1.8;">
        <strong>تذکر بالینی و حفاظت پرتوی:</strong> این گزارش شامل تصاویر رادیوگرافی تشخیصی دندانپزشکی است که با رعایت اصول حفاظتی آلارا (ALARA) تهیه شده است. نسخه حاضر برای مشاوره و ادامه درمان در سایر مراکز تخصصی دارای اعتبار بالینی است.
      </div>
    </body>
    </html>
  `}export{h as a,y as g,b as m,l as p};
