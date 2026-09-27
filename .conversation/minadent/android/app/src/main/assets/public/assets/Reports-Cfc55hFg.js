import{j as e,d as ve,g as p,n as He,m as Ve,o as Je,a as Xe,b6 as qe,f as Qe,bj as Ze,v as et,z as me,R as he,S as ue,e as r,a4 as tt,h as se,k as ae,y as st,a6 as at,af as Me,an as ot,b1 as nt,ba as it,C as z,Y as C,$ as h,B as lt}from"./index-CGUuXpKJ.js";import{R as De,u as rt,r as c}from"./vendor-react-CUTMqg7W.js";import{b as ct}from"./printDocument-N_7D99vH.js";import{M as dt,R as Ce,a as v}from"./ModuleHeader-B6Tnqoit.js";import{P as pt}from"./PatientDebtBar-Bt2B2RFn.js";import{t as xt,g as mt}from"./colors-DO--FbDr.js";import{R as K,A as Fe,g as ht,X as F,Y as A,T as _,L as Ae,a as ne,B as J,b as X,C as q,h as ut,i as ft,e as Ke,f as _e}from"./vendor-charts-Df_9Zi7h.js";import{a6 as gt,y as bt,O as fe,G as P,T as Te,U as ge,g as Re,n as be,b5 as je,b6 as M,b7 as jt,as as Oe,b8 as oe}from"./vendor-icons-CXCZz8nB.js";import"./vendor-dexie-BigZnyxg.js";import"./vendor-supabase-wIXNjVJv.js";function yt({payments:Q,expenses:b,startDate:I,endDate:$}){const L=De.useMemo(()=>{const d={};Q.forEach(j=>{var g;if(j.status!=="cancelled"){const x=((g=j.payment_date)==null?void 0:g.slice(0,7))||"";x&&(d[x]=d[x]||{income:0,expense:0},d[x].income+=Number(j.amount)||0)}}),b==null||b.forEach(j=>{var g;if(j.status!=="cancelled"){const x=((g=j.date)==null?void 0:g.slice(0,7))||"";x&&(d[x]=d[x]||{income:0,expense:0},d[x].expense+=Number(j.amount)||0)}});const f=[];for(const[j,g]of Object.entries(d))f.push({date:j,income:g.income,expense:g.expense,net:g.income-g.expense});return f.sort((j,g)=>j.date.localeCompare(g.date))},[Q,b]),u=De.useMemo(()=>!I&&!$?L:L.filter(d=>!(I&&d.date<I.slice(0,7)||$&&d.date>$.slice(0,7))),[L,I,$]),ie=({active:d,payload:f,label:j})=>{var g,x;if(d&&f&&f.length){const le=ve(j),G=((g=f.find(Y=>Y.dataKey==="income"))==null?void 0:g.value)||0,Z=((x=f.find(Y=>Y.dataKey==="expense"))==null?void 0:x.value)||0,k=G-Z;return e.jsxs("div",{className:"bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4",children:[e.jsx("p",{className:"text-sm font-medium text-slate-800 dark:text-slate-100 mb-2",children:le}),e.jsxs("p",{className:"text-xs text-slate-500 dark:text-slate-400",children:["درآمد: ",e.jsx("span",{className:"text-success-600 dark:text-success-400 font-medium",children:p(G)})]}),e.jsxs("p",{className:"text-xs text-slate-500 dark:text-slate-400",children:["هزینه: ",e.jsx("span",{className:"text-error-600 dark:text-error-400 font-medium",children:p(Z)})]}),e.jsxs("p",{className:"text-xs text-slate-500 dark:text-slate-400",children:["خالص: ",e.jsx("span",{className:`font-medium ${k>=0?"text-success-600 dark:text-success-400":"text-error-600 dark:text-error-400"}`,children:p(k)})]})]})}return null};return u.length===0?e.jsx("div",{className:"text-center py-8 text-slate-400 dark:text-slate-500",children:"داده‌ای برای نمایش وجود ندارد"}):e.jsxs("div",{className:"w-full h-[300px]",children:[e.jsx(K,{width:"100%",height:"100%",children:e.jsxs(Fe,{data:u,margin:{top:10,right:30,left:0,bottom:0},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"incomeGradient",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:"#10b981",stopOpacity:.3}),e.jsx("stop",{offset:"95%",stopColor:"#10b981",stopOpacity:0})]}),e.jsxs("linearGradient",{id:"expenseGradient",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:"#ef4444",stopOpacity:.3}),e.jsx("stop",{offset:"95%",stopColor:"#ef4444",stopOpacity:0})]})]}),e.jsx(ht,{strokeDasharray:"3 3",stroke:"#e2e8f0",vertical:!1}),e.jsx(F,{dataKey:"date",tickFormatter:d=>ve(d).slice(0,7),tick:{fontSize:10,fill:"#94a3b8"},tickLine:!1,axisLine:!1}),e.jsx(A,{tickFormatter:d=>p(d),tick:{fontSize:10,fill:"#94a3b8"},tickLine:!1,axisLine:!1}),e.jsx(_,{content:e.jsx(ie,{})}),e.jsx(Ae,{wrapperStyle:{fontSize:10}}),e.jsx(ne,{type:"monotone",dataKey:"income",stroke:"#10b981",strokeWidth:2,fill:"url(#incomeGradient)",name:"درآمد"}),e.jsx(ne,{type:"monotone",dataKey:"expense",stroke:"#ef4444",strokeWidth:2,fill:"url(#expenseGradient)",name:"هزینه"})]})}),e.jsxs("div",{className:"mt-4 flex items-center justify-between text-xs",children:[e.jsxs("div",{className:"text-center",children:[e.jsx("p",{className:"text-slate-500 dark:text-slate-400",children:"کل درآمد"}),e.jsx("p",{className:"text-success-600 dark:text-success-400 font-medium",children:p(u.reduce((d,f)=>d+f.income,0))})]}),e.jsxs("div",{className:"text-center",children:[e.jsx("p",{className:"text-slate-500 dark:text-slate-400",children:"کل هزینه"}),e.jsx("p",{className:"text-error-600 dark:text-error-400 font-medium",children:p(u.reduce((d,f)=>d+f.expense,0))})]}),e.jsxs("div",{className:"text-center",children:[e.jsx("p",{className:"text-slate-500 dark:text-slate-400",children:"خالص"}),e.jsx("p",{className:`font-medium ${u.reduce((d,f)=>d+f.net,0)>=0?"text-success-600 dark:text-success-400":"text-error-600 dark:text-error-400"}`,children:p(u.reduce((d,f)=>d+f.net,0))})]})]})]})}const E=["#0ea5e9","#8b5cf6","#f59e0b","#10b981","#ef4444","#6366f1","#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7"],Pe={scheduled:"زمان‌بندی شده",confirmed:"تایید شده",in_chair:"روی صندلی",completed:"تکمیل شده",cancelled:"لغو شده",no_show:"حضور نداشت"},Ee={consultation:"مشاوره",treatment:"درمان",surgery:"جراحی",orthodontics:"ارتودنسی",implant:"ایمپلنت",follow_up:"ویزیت مجدد",checkup:"معاینه",emergency:"اورژانس",cleaning:"جرم‌گیری",extraction:"کشیدن",root_canal:"عصب‌کشی",other:"سایر"},ye={restorative:"ترمیمی",endodontics:"عصب‌کشی",surgery:"جراحی",prosthetics:"پروتز",orthodontics:"ارتودنسی",pediatric:"اطفال",preventive:"پیشگیری",diagnostic:"تشخیصی",cosmetic:"زیبایی",implant:"ایمپلنت",periodontics:"لثه",other:"سایر"};function Kt(){const Q=rt(),[b,I]=c.useState("revenue"),[$,L]=c.useState([]),[u,ie]=c.useState([]),[d,f]=c.useState([]),[j,g]=c.useState([]),[x,le]=c.useState([]),[G,Z]=c.useState([]),[k,Y]=c.useState([]),[B,Ie]=c.useState([]),[Le,ke]=c.useState(!0),we=c.useCallback(async()=>{ke(!0);try{const[t,s,a,i,n,o,l,m]=await Promise.all([He(),Ve(),Je(),Xe(),qe(),Qe(),Ze(),et()]);L(t),ie(s),g(a),le(i),Z(n),Y(o),Ie(l),f(m)}catch(t){console.error("Error loading reports:",t),me("error","خطا در بارگذاری گزارش‌ها")}finally{ke(!1)}},[]);c.useEffect(()=>{we()},[we]);const U=c.useMemo(()=>{const t=new Date,s=[];for(let a=11;a>=0;a--){const i=new Date(t.getFullYear(),t.getMonth()-a,1),n=new Date(t.getFullYear(),t.getMonth()-a+1,1),o=$.filter(y=>{const N=new Date(y.payment_date);return N>=i&&N<n&&y.status==="completed"}).reduce((y,N)=>y+(N.amount||0),0),l=B.filter(y=>{const N=new Date(y.date);return N>=i&&N<n}).reduce((y,N)=>y+(N.amount||0),0),{month:m,year:S}=he(i.toISOString());s.push({label:`${ue[m-1]} ${r(S)}`,revenue:o,expenses:l})}return s},[$,B]),re=c.useMemo(()=>U.map(t=>({label:t.label,profit:t.revenue-t.expenses})),[U]),R=c.useMemo(()=>{const t=$.filter(n=>n.status==="completed").reduce((n,o)=>n+(o.amount||0),0),s=B.reduce((n,o)=>n+(o.amount||0),0),a=t-s,i=t/12;return{totalRevenue:t,totalExpenses:s,profit:a,avgMonthlyRevenue:i}},[$,B]),Se=c.useMemo(()=>{const t=new Date,s=[];let a=0;for(let i=11;i>=0;i--){const n=new Date(t.getFullYear(),t.getMonth()-i,1),o=new Date(t.getFullYear(),t.getMonth()-i+1,1);a=u.filter(y=>new Date(y.created_at)<o).length;const{month:m,year:S}=he(n.toISOString());s.push({label:`${ue[m-1]} ${r(S)}`,total:a})}return s},[u]),Ne=c.useMemo(()=>{const t=new Date,s=[];for(let a=11;a>=0;a--){const i=new Date(t.getFullYear(),t.getMonth()-a,1),n=new Date(t.getFullYear(),t.getMonth()-a+1,1),o=u.filter(S=>{const y=new Date(S.created_at);return y>=i&&y<n}).length,{month:l,year:m}=he(i.toISOString());s.push({label:`${ue[l-1]} ${r(m)}`,count:o})}return s},[u]),ee=c.useMemo(()=>{const t=u.length,s=new Date,a=u.filter(o=>{const l=new Date(o.created_at);return l.getMonth()===s.getMonth()&&l.getFullYear()===s.getFullYear()}).length,i=u.filter(o=>{const l=new Date(o.created_at),m=new Date(s.getFullYear(),s.getMonth()-1,1);return l.getMonth()===m.getMonth()&&l.getFullYear()===m.getFullYear()}).length,n=i>0?(a-i)/i*100:0;return{total:t,thisMonth:a,lastMonth:i,growth:n}},[u]),W=c.useMemo(()=>{const t={};return x.forEach(s=>{const a=s.procedure_category?ye[s.procedure_category]||s.procedure_category:"سایر";t[a]=(t[a]||0)+1}),Object.entries(t).map(([s,a])=>({name:s,value:a}))},[x]),ce=c.useMemo(()=>{const t={};return G.forEach(s=>{const a=s.category?ye[s.category]||s.category:"سایر";t[a]=(t[a]||0)+1}),Object.entries(t).map(([s,a])=>({name:s,count:a}))},[G]),O=c.useMemo(()=>{const t=x.length,s=x.filter(n=>n.status==="completed").length,a=x.filter(n=>n.status==="in_progress"||n.status==="planned").length,i=x.filter(n=>n.status!=="cancelled").reduce((n,o)=>n+(o.total_price||0),0);return{total:t,completed:s,inProgress:a,totalValue:i}},[x]),ze=c.useMemo(()=>{const t=new Date,s=new Date(t);s.setDate(t.getDate()-tt(t));const a=[],i=["شن","یک","دو","سه","چه","پن","جم"];for(let n=0;n<7;n++){const o=new Date(s);o.setDate(s.getDate()+n);const l=o.toISOString().slice(0,10),m=k.filter(S=>S.date===l).length;a.push({day:i[n],count:m})}return a},[k]),de=c.useMemo(()=>{const t={};return k.forEach(s=>{const a=Pe[s.status]||s.status;t[a]=(t[a]||0)+1}),Object.entries(t).map(([s,a])=>({name:s,value:a}))},[k]),pe=c.useMemo(()=>{const t={};return k.forEach(s=>{const a=Ee[s.type||"other"]||"سایر";t[a]=(t[a]||0)+1}),Object.entries(t).map(([s,a])=>({name:s,count:a}))},[k]),D=c.useMemo(()=>{const t=k.length,s=k.filter(o=>o.status==="completed").length,a=k.filter(o=>o.status==="cancelled").length,i=k.filter(o=>o.status==="no_show").length,n=t>0?s/t*100:0;return{total:t,completed:s,cancelled:a,noShow:i,completionRate:n}},[k]),te=c.useCallback((t,s,a)=>{se.confirm();try{const i=[];i.push(a.map(S=>S.label).join(","));for(const S of t){const y=a.map(N=>{const xe=S[N.key]??"";return`"${String(xe).replace(/"/g,'""')}"`});i.push(y.join(","))}const n="\uFEFF"+i.join(`
`),o=new Blob([n],{type:"text/csv;charset=utf-8;"}),l=URL.createObjectURL(o),m=document.createElement("a");m.href=l,m.download=`${s}-${new Date().toISOString().slice(0,10)}.csv`,m.click(),URL.revokeObjectURL(l),ae.playSuccess(),me("success","فایل CSV دانلود شد")}catch{ae.playWarning(),me("error","خطا در ایجاد فایل")}},[se]),Ge=()=>{te(U,"گزارش-درآمد",[{key:"label",label:"ماه"},{key:"revenue",label:"درآمد"},{key:"expenses",label:"هزینه"}])},Ye=()=>{const t=u.map(s=>({name:`${s.first_name||""} ${s.last_name||""}`.trim(),phone:s.phone||"",status:s.is_active?"فعال":"غیرفعال",created:Me(s.created_at)}));te(t,"لیست-بیماران",[{key:"name",label:"نام"},{key:"phone",label:"تلفن"},{key:"status",label:"وضعیت"},{key:"created",label:"تاریخ ثبت"}])},Be=()=>{const t=k.map(s=>({date:s.date,time:s.start_time||"",status:Pe[s.status]||s.status,type:Ee[s.type||"other"]||s.type}));te(t,"گزارش-نوبت‌ها",[{key:"date",label:"تاریخ"},{key:"time",label:"ساعت"},{key:"status",label:"وضعیت"},{key:"type",label:"نوع"}])},w=c.useMemo(()=>{const{byPatient:t}=st($,x,d),s=new Map(j.map(l=>[l.id,l])),a=new Date().toISOString().slice(0,10),i=l=>Math.floor((new Date(a).getTime()-new Date(l).getTime())/864e5),n=[];for(const[l,m]of t.entries()){if(m.balance<=0)continue;const S=u.find(V=>V.id===l);if(!S)continue;const N=x.filter(V=>V.patient_id===l).map(V=>{var $e;return($e=s.get(V.encounter_id))==null?void 0:$e.encounter_date}).filter(Boolean),xe=N.length>0?N.sort().reverse()[0]:a,H=Math.max(0,i(xe)),We=H<=30?"0-30":H<=60?"31-60":H<=90?"61-90":"90+";n.push({patientId:l,name:`${S.first_name} ${S.last_name}`,balance:m.balance,days:H,bucket:We})}n.sort((l,m)=>m.days-l.days);const o={"0-30":0,"31-60":0,"61-90":0,"90+":0};for(const l of n)o[l.bucket]+=l.balance;return{rows:n,totals:o,grandTotal:n.reduce((l,m)=>l+m.balance,0)}},[$,x,d,u,j]),Ue=c.useCallback(()=>{se.tap(),ae.playPop();const t=window.open("","_blank","width=900,height=1000");if(!t)return;const s=new Date().toISOString().slice(0,10),a=new Date().toTimeString().slice(0,5),i=`
      * { box-sizing: border-box; }
      body {
        font-family: Tahoma, 'IRANSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        direction: rtl;
        margin: 0;
        padding: 24px;
        background: #fff;
        color: #1e293b;
        font-size: 13px;
        line-height: 1.6;
      }
      .report-header {
        border-bottom: 2px solid #0284c7;
        padding-bottom: 16px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .clinic-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .clinic-logo {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
      }
      .clinic-title {
        font-size: 17px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 4px 0;
      }
      .clinic-sub {
        font-size: 11px;
        color: #64748b;
        margin: 0;
      }
      .meta-box {
        text-align: left;
        font-size: 11px;
        color: #475569;
        background: #f8fafc;
        padding: 8px 14px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        line-height: 1.8;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }
      .kpi-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .kpi-title {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 4px;
        font-weight: 600;
      }
      .kpi-val {
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
      }
      .kpi-card.green { border-top: 3px solid #10b981; }
      .kpi-card.blue { border-top: 3px solid #0284c7; }
      .kpi-card.purple { border-top: 3px solid #8b5cf6; }
      .kpi-card.rose { border-top: 3px solid #f43f5e; }

      .section-box {
        margin-bottom: 18px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }
      .section-header {
        background: #f1f5f9;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      th {
        background: #f8fafc;
        color: #475569;
        padding: 8px 10px;
        text-align: right;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
      }
      td {
        padding: 7px 10px;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      tr:last-child td { border-bottom: none; }
      .sign-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px dashed #cbd5e1;
      }
      .sign-box {
        text-align: center;
        padding: 12px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .sign-title { font-weight: bold; margin-bottom: 35px; color: #334155; font-size: 11px; }
      .sign-line { border-top: 1px dotted #94a3b8; width: 65%; margin: 0 auto 4px; }
      @media print {
        body { padding: 0; }
        @page { size: A4 portrait; margin: 12mm; }
      }
    `,n=`
      <div class="report-header">
        <div class="clinic-brand">
          <div class="clinic-logo">M</div>
          <div>
            <h1 class="clinic-title">کلینیک تخصصی دندانپزشکی مینادنت</h1>
            <p class="clinic-sub">کارنامه رسمی عملکرد و تحلیل مدیریتی کلینیک (Executive Management Report)</p>
          </div>
        </div>
        <div class="meta-box">
          <div><strong>تاریخ صدور:</strong> ${ve(s)}</div>
          <div><strong>زمان صدور:</strong> ${r(at(a))}</div>
          <div><strong>نوع گزارش:</strong> کارنامه جامع مالی و بالینی</div>
        </div>
      </div>

      <!-- Financial KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card green">
          <div class="kpi-title">درآمد وصول‌شده کل</div>
          <div class="kpi-val">${r(p(R.totalRevenue))} ت</div>
        </div>
        <div class="kpi-card rose">
          <div class="kpi-title">مجموع هزینه‌های کلینیک</div>
          <div class="kpi-val">${r(p(R.totalExpenses))} ت</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-title">سود خالص عملیاتی</div>
          <div class="kpi-val">${r(p(R.profit))} ت</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-title">مانده مطالبات معوق بیماران</div>
          <div class="kpi-val">${r(p(w.grandTotal))} ت</div>
        </div>
      </div>

      <!-- Operational KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-title">کل نوبت‌های ثبت‌شده</div>
          <div class="kpi-val">${r(D.total)} نوبت</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-title">نوبت‌های موفق انجام‌شده</div>
          <div class="kpi-val">${r(D.completed)} نوبت</div>
        </div>
        <div class="kpi-card rose">
          <div class="kpi-title">کنسلی و عدم حضور</div>
          <div class="kpi-val">${r(D.cancelled+D.noShow)} نوبت</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-title">نرخ حضور و بهره‌وری</div>
          <div class="kpi-val">${r(D.completionRate.toFixed(1))}٪</div>
        </div>
      </div>

      <!-- Treatment Distribution Table -->
      <div class="section-box">
        <div class="section-header">
          <span>توزیع خدمات بالینی و درمان‌های انجام‌شده</span>
          <span>مجموع رویه‌ها: ${r(O.total)} مورد</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>دسته خدمت دندانپزشکی</th>
              <th>تعداد پرونده / انجام‌شده</th>
              <th>سهم درصدی از کل</th>
            </tr>
          </thead>
          <tbody>
            ${W.map(o=>{const l=O.total>0?(o.value/O.total*100).toFixed(1):"0";return`
                <tr>
                  <td><strong>${o.name}</strong></td>
                  <td>${r(o.value)} مورد</td>
                  <td>${r(l)}٪</td>
                </tr>
              `}).join("")}
          </tbody>
        </table>
      </div>

      <!-- Outstanding Debt Aging -->
      <div class="section-box">
        <div class="section-header">
          <span>تحلیل سن مطالبات معوق (Aging Debt Analysis)</span>
          <span>مجموع بدهی: ${r(p(w.grandTotal))} تومان</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>بازه سن بدهی</th>
              <th>تعداد بیماران</th>
              <th>مبلغ مطالبات معوق (تومان)</th>
              <th>وضعیت ریسک</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>۰ تا ۳۰ روز (جاری)</td>
              <td>${r(w.rows.filter(o=>o.bucket==="0-30").length)} بیمار</td>
              <td>${r(p(w.totals["0-30"]))}</td>
              <td style="color: #10b981;">طبیعی / در جریان</td>
            </tr>
            <tr>
              <td>۳۱ تا ۶۰ روز</td>
              <td>${r(w.rows.filter(o=>o.bucket==="31-60").length)} بیمار</td>
              <td>${r(p(w.totals["31-60"]))}</td>
              <td style="color: #f59e0b;">پیگیری ملایم</td>
            </tr>
            <tr>
              <td>۶۱ تا ۹۰ روز</td>
              <td>${r(w.rows.filter(o=>o.bucket==="61-90").length)} بیمار</td>
              <td>${r(p(w.totals["61-90"]))}</td>
              <td style="color: #f97316;">هشدار و اخطار مالی</td>
            </tr>
            <tr>
              <td>بیش از ۹۰ روز (معوقه سوخت‌شده)</td>
              <td>${r(w.rows.filter(o=>o.bucket==="90+").length)} بیمار</td>
              <td>${r(p(w.totals["90+"]))}</td>
              <td style="color: #ef4444; font-weight: bold;">ریسک بالا / انسداد نوبت</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Signatures -->
      <div class="sign-section">
        <div class="sign-box">
          <div class="sign-title">مسئول فنی و امور بالینی کلینیک</div>
          <div class="sign-line"></div>
          <div style="font-size: 11px; color: #64748b;">مهر، تاریخ و امضا</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">مدیریت اداری و امور مالی کلینیک</div>
          <div class="sign-line"></div>
          <div style="font-size: 11px; color: #64748b;">مهر، تاریخ و امضا</div>
        </div>
      </div>
    `;t.document.write(ct({title:`کارنامه عملکرد کلینیک مینادنت - ${Me(s)}`,styles:i,bodyHtml:n})),t.document.close(),ae.playSuccess()},[R,w,D,W,O]);if(Le)return e.jsx("div",{className:"flex items-center justify-center py-20",children:e.jsx(ot,{size:32})});const T={direction:"rtl",fontSize:12,borderRadius:12,border:"none",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"};return e.jsxs("div",{className:"space-y-6",children:[e.jsx(dt,{moduleKey:"reports",title:"گزارش‌ها",subtitle:"تحلیل و گزارش‌گیری عملکرد کلینیک",action:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("button",{onClick:Ue,className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/90 text-white text-xs font-bold shadow-sm hover:bg-primary-600 transition-all-smooth press-scale",title:"چاپ کارنامه رسمی و مدیریت کلینیک در فرمت استاندارد A4",children:[e.jsx(gt,{size:14})," چاپ کارنامه رسمی"]}),e.jsxs("button",{onClick:()=>{if(b==="revenue")Ge();else if(b==="patients")Ye();else if(b==="appointments")Be();else if(b==="treatments"){const t=x.map(s=>({procedure:s.procedure_name||"",category:s.procedure_category?ye[s.procedure_category]||s.procedure_category:"سایر",status:s.status||"",price:s.total_price||0,tooth:s.tooth_number?nt(s.tooth_number):""}));te(t,"گزارش-درمان‌ها",[{key:"procedure",label:"رویه"},{key:"category",label:"دسته"},{key:"status",label:"وضعیت"},{key:"price",label:"قیمت"},{key:"tooth",label:"دندان"}])}},className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold backdrop-blur-sm hover:bg-white/30 transition-all-smooth press-scale",children:[e.jsx(bt,{size:14})," خروجی CSV"]})]})}),e.jsx(it,{tabs:[{key:"revenue",label:"درآمد",icon:e.jsx(fe,{size:16})},{key:"cashflow",label:"نقدینگی",icon:e.jsx(P,{size:16})},{key:"aging",label:"سن بدهی",icon:e.jsx(Te,{size:16})},{key:"patients",label:"بیماران",icon:e.jsx(ge,{size:16})},{key:"treatments",label:"درمان‌ها",icon:e.jsx(Re,{size:16})},{key:"appointments",label:"نوبت‌ها",icon:e.jsx(be,{size:16})}],active:b,onChange:t=>{se.select(),I(t)}}),b==="cashflow"&&e.jsx("div",{className:"space-y-6",children:e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2",children:[e.jsx(P,{size:18,className:"text-primary-600"}),"روند نقدینگی ماهانه"]}),e.jsx(yt,{payments:$,expenses:B})]})}),b==="revenue"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx(Ce,{storageKey:"reports-revenue",items:[{key:"total",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(P,{size:20}),label:"درآمد کل",value:`${p(R.totalRevenue)} ت`})},{key:"expenses",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(je,{size:20}),label:"هزینه‌های کل",value:`${p(R.totalExpenses)} ت`})},{key:"profit",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(fe,{size:20}),label:"سود خالص",value:`${p(R.profit)} ت`})},{key:"avg",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(M,{size:20}),label:"میانگین ماهانه",value:`${p(Math.round(R.avgMonthlyRevenue))} ت`})}]}),e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(P,{size:18,className:"text-success-600"}),"درآمد و هزینه‌های ۱۲ ماه اخیر"]}),U.every(t=>t.revenue===0&&t.expenses===0)?e.jsx(C,{icon:e.jsx(P,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:300,children:e.jsxs(Fe,{data:U,margin:{top:10,right:10,left:10,bottom:0},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"revGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:"#10b981",stopOpacity:.3}),e.jsx("stop",{offset:"95%",stopColor:"#10b981",stopOpacity:0})]}),e.jsxs("linearGradient",{id:"expGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:"#ef4444",stopOpacity:.3}),e.jsx("stop",{offset:"95%",stopColor:"#ef4444",stopOpacity:0})]})]}),e.jsx(F,{dataKey:"label",tick:{fontSize:10,fill:"#64748b"}}),e.jsx(A,{tick:{fontSize:11,fill:"#64748b"},tickFormatter:t=>h(Math.round(t/1e6)),width:50}),e.jsx(_,{formatter:t=>`${p(t)} ت`,contentStyle:T}),e.jsx(Ae,{}),e.jsx(ne,{type:"monotone",dataKey:"revenue",name:"درآمد",stroke:"#10b981",strokeWidth:2,fill:"url(#revGrad)"}),e.jsx(ne,{type:"monotone",dataKey:"expenses",name:"هزینه",stroke:"#ef4444",strokeWidth:2,fill:"url(#expGrad)"})]})})]}),e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(M,{size:18,className:"text-primary-600"}),"سود ماهانه"]}),re.every(t=>t.profit===0)?e.jsx(C,{icon:e.jsx(M,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:250,children:e.jsxs(J,{data:re,margin:{top:10,right:10,left:10,bottom:0},children:[e.jsx(F,{dataKey:"label",tick:{fontSize:10,fill:"#64748b"}}),e.jsx(A,{tick:{fontSize:11,fill:"#64748b"},tickFormatter:t=>h(Math.round(t/1e6)),width:50}),e.jsx(_,{formatter:t=>`${p(t)} ت`,contentStyle:T}),e.jsx(X,{dataKey:"profit",name:"سود",radius:[6,6,0,0],children:re.map((t,s)=>e.jsx(q,{fill:t.profit>=0?"#10b981":"#ef4444"},s))})]})})]})]}),b==="aging"&&e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"grid grid-cols-2 gap-2.5",children:["0-30","31-60","61-90","90+"].map(t=>e.jsxs(z,{className:`p-3.5 ${t==="90+"?"border-2 border-error-200":""}`,children:[e.jsx("p",{className:"text-[11px] text-slate-400",children:t==="0-30"?"۰ تا ۳۰ روز":t==="31-60"?"۳۱ تا ۶۰ روز":t==="61-90"?"۶۱ تا ۹۰ روز":"بیش از ۹۰ روز"}),e.jsxs("p",{className:`text-base font-extrabold ${t==="90+"?"text-error-600":"text-slate-700"}`,children:[p(w.totals[t])," ت"]})]},t))}),e.jsx(z,{className:"p-4",children:e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("p",{className:"text-sm font-bold text-slate-700",children:"مجموع بدهی معوق"}),e.jsxs("p",{className:"text-lg font-extrabold text-error-600",children:[p(w.grandTotal)," تومان"]})]})}),w.rows.length===0?e.jsx(C,{icon:e.jsx(Te,{size:40}),title:"بدهی معوقی نیست",description:"همه‌ی بیماران تسویه‌حساب دارند"}):e.jsx("div",{className:"space-y-2",children:w.rows.map((t,s)=>{const a=xt[mt(t.patientId)],i=Math.min(s,15)*.05;return e.jsxs(z,{className:`p-3.5 relative overflow-hidden transition-all duration-300 stagger-item bg-gradient-to-br ${a.bg} ${a.border}`,style:{animationDelay:`${i}s`},children:[e.jsx("div",{className:`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-20 breathe-slow pointer-events-none ${a.text}`}),e.jsxs("div",{className:"relative z-10 flex items-center justify-between gap-2 cursor-pointer",onClick:()=>Q(`/patients/${t.patientId}`),children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-bold text-slate-800",children:t.name}),e.jsxs("p",{className:"text-[11px] text-slate-400",children:[r(t.days)," روز از آخرین فعالیت"]})]}),e.jsxs("div",{className:"text-left flex flex-col items-end gap-1",children:[e.jsx(pt,{patientId:t.patientId,balance:{balance:t.balance,paid:0,totalCost:0},variant:"compact"}),e.jsx(lt,{color:t.bucket==="90+"?"error":t.bucket==="61-90"?"warning":"slate",children:t.bucket==="0-30"?"جدید":t.bucket==="90+"?"بحرانی":"پیگیری"})]})]})]},t.patientId)})})]}),b==="patients"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx(Ce,{storageKey:"reports-patients",items:[{key:"total",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(ge,{size:20}),label:"کل بیماران",value:h(ee.total)})},{key:"month",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(jt,{size:20}),label:"بیماران این ماه",value:h(ee.thisMonth)})},{key:"lastmonth",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(je,{size:20}),label:"بیماران ماه قبل",value:h(ee.lastMonth)})},{key:"growth",node:e.jsx(v,{moduleKey:"reports",icon:e.jsx(P,{size:20}),label:"نرخ رشد",value:`${r(Math.round(ee.growth))}٪`})}]}),e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(P,{size:18,className:"text-primary-600"}),"رشد بیماران (۱۲ ماه)"]}),Se.every(t=>t.total===0)?e.jsx(C,{icon:e.jsx(ge,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:300,children:e.jsxs(ut,{data:Se,margin:{top:10,right:10,left:10,bottom:0},children:[e.jsx(F,{dataKey:"label",tick:{fontSize:10,fill:"#64748b"}}),e.jsx(A,{tick:{fontSize:11,fill:"#64748b"},tickFormatter:t=>h(t),width:50}),e.jsx(_,{formatter:t=>h(t),contentStyle:T}),e.jsx(ft,{type:"monotone",dataKey:"total",name:"کل بیماران",stroke:"#0ea5e9",strokeWidth:2,dot:{r:3}})]})})]}),e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(M,{size:18,className:"text-accent-600"}),"بیماران جدید ماهانه"]}),Ne.every(t=>t.count===0)?e.jsx(C,{icon:e.jsx(M,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:250,children:e.jsxs(J,{data:Ne,margin:{top:10,right:10,left:10,bottom:0},children:[e.jsx(F,{dataKey:"label",tick:{fontSize:10,fill:"#64748b"}}),e.jsx(A,{tick:{fontSize:11,fill:"#64748b"},allowDecimals:!1,width:40}),e.jsx(_,{formatter:t=>h(t),contentStyle:T}),e.jsx(X,{dataKey:"count",name:"بیماران جدید",fill:"#8b5cf6",radius:[6,6,0,0]})]})})]})]}),b==="treatments"&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-3",children:[e.jsx(v,{moduleKey:"reports",icon:e.jsx(Re,{size:20}),label:"کل درمان‌ها",value:h(O.total)}),e.jsx(v,{moduleKey:"reports",icon:e.jsx(Oe,{size:20}),label:"تکمیل شده",value:h(O.completed)}),e.jsx(v,{moduleKey:"reports",icon:e.jsx(M,{size:20}),label:"در حال انجام",value:h(O.inProgress)}),e.jsx(v,{moduleKey:"reports",icon:e.jsx(fe,{size:20}),label:"ارزش کل",value:`${p(O.totalValue)} ت`})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(oe,{size:18,className:"text-primary-600"}),"توزیع درمان‌ها"]}),W.length===0?e.jsx(C,{icon:e.jsx(oe,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:300,children:e.jsxs(Ke,{children:[e.jsx(_e,{data:W,dataKey:"value",nameKey:"name",cx:"50%",cy:"50%",outerRadius:90,label:t=>`${t.name}: ${r(t.value)}`,children:W.map((t,s)=>e.jsx(q,{fill:E[s%E.length]},s))}),e.jsx(_,{formatter:t=>h(t),contentStyle:T})]})})]}),e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(M,{size:18,className:"text-accent-600"}),"رویه‌ها بر اساس دسته"]}),ce.length===0?e.jsx(C,{icon:e.jsx(M,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:300,children:e.jsxs(J,{data:ce,layout:"vertical",margin:{top:0,right:10,left:10,bottom:0},children:[e.jsx(F,{type:"number",tick:{fontSize:11,fill:"#64748b"}}),e.jsx(A,{dataKey:"name",type:"category",tick:{fontSize:11,fill:"#64748b"},width:80}),e.jsx(_,{formatter:t=>h(t),contentStyle:T}),e.jsx(X,{dataKey:"count",radius:[0,6,6,0],children:ce.map((t,s)=>e.jsx(q,{fill:E[s%E.length]},s))})]})})]})]})]}),b==="appointments"&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-3",children:[e.jsx(v,{moduleKey:"reports",icon:e.jsx(be,{size:20}),label:"کل نوبت‌ها",value:h(D.total)}),e.jsx(v,{moduleKey:"reports",icon:e.jsx(Oe,{size:20}),label:"تکمیل شده",value:h(D.completed)}),e.jsx(v,{moduleKey:"reports",icon:e.jsx(je,{size:20}),label:"لغو شده",value:h(D.cancelled)}),e.jsx(v,{moduleKey:"reports",icon:e.jsx(P,{size:20}),label:"نرخ تکمیل",value:`${r(Math.round(D.completionRate))}٪`})]}),e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(M,{size:18,className:"text-primary-600"}),"نوبت‌های هفته جاری"]}),ze.every(t=>t.count===0)?e.jsx(C,{icon:e.jsx(be,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:250,children:e.jsxs(J,{data:ze,margin:{top:10,right:10,left:10,bottom:0},children:[e.jsx(F,{dataKey:"day",tick:{fontSize:11,fill:"#64748b"}}),e.jsx(A,{tick:{fontSize:11,fill:"#64748b"},allowDecimals:!1,width:40}),e.jsx(_,{formatter:t=>h(t),contentStyle:T}),e.jsx(X,{dataKey:"count",name:"نوبت",fill:"#0ea5e9",radius:[6,6,0,0]})]})})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(oe,{size:18,className:"text-accent-600"}),"نوبت‌ها بر اساس وضعیت"]}),de.length===0?e.jsx(C,{icon:e.jsx(oe,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:300,children:e.jsxs(Ke,{children:[e.jsx(_e,{data:de,dataKey:"value",nameKey:"name",cx:"50%",cy:"50%",outerRadius:90,label:t=>`${t.name}: ${r(t.value)}`,children:de.map((t,s)=>e.jsx(q,{fill:E[s%E.length]},s))}),e.jsx(_,{formatter:t=>h(t),contentStyle:T})]})})]}),e.jsxs(z,{className:"p-5",children:[e.jsxs("h2",{className:"text-base font-bold text-slate-800 mb-4 flex items-center gap-2",children:[e.jsx(M,{size:18,className:"text-warning-600"}),"نوبت‌ها بر اساس نوع"]}),pe.length===0?e.jsx(C,{icon:e.jsx(M,{size:28}),title:"داده‌ای موجود نیست"}):e.jsx(K,{width:"100%",height:300,children:e.jsxs(J,{data:pe,layout:"vertical",margin:{top:0,right:10,left:10,bottom:0},children:[e.jsx(F,{type:"number",tick:{fontSize:11,fill:"#64748b"}}),e.jsx(A,{dataKey:"name",type:"category",tick:{fontSize:11,fill:"#64748b"},width:80}),e.jsx(_,{formatter:t=>h(t),contentStyle:T}),e.jsx(X,{dataKey:"count",radius:[0,6,6,0],children:pe.map((t,s)=>e.jsx(q,{fill:E[s%E.length]},s))})]})})]})]})]})]})}export{Kt as default};
