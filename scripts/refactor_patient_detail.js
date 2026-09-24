import fs from 'fs';

const filePath = 'src/pages/PatientDetail.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update activeTab state declaration
const oldState = "const [activeTab, setActiveTab] = useState(() => locState.initialTab || 'overview')";
const newState = `const initial = locState.initialTab || 'overview'
  const getInitialMainTab = (tab: string) => {
    if (['overview'].includes(tab)) return 'overview'
    if (['appointments'].includes(tab)) return 'appointments'
    if (['teeth', 'treatments', 'implants', 'perio', 'ortho', 'phases'].includes(tab)) return 'clinical'
    if (['payments', 'labOrders', 'prescriptions', 'radiology', 'consent', 'insurance', 'documents', 'timeline'].includes(tab)) return 'finance_docs'
    return 'overview'
  }

  const [mainTab, setMainTab] = useState<'overview' | 'clinical' | 'appointments' | 'finance_docs'>(getInitialMainTab(initial) as any)
  const [subView, setSubView] = useState<string | null>(['overview', 'appointments'].includes(initial) ? null : initial)`;

content = content.replace(oldState, newState);

// 2. Update locState listener
const oldListener = `if (locState.initialTab && locState.initialTab !== activeTab) {
      setActiveTab(locState.initialTab)
    }`;
const newListener = `if (locState.initialTab) {
      setMainTab(getInitialMainTab(locState.initialTab) as any)
      setSubView(['overview', 'appointments'].includes(locState.initialTab) ? null : locState.initialTab)
    }`;
content = content.replace(oldListener, newListener);

// 3. Inject new render helpers before Main Render
const newHelpers = `
  // ===========================================================================
  // Render: Mobile-First Architecture Helpers
  // ===========================================================================

  const renderQuickActions = () => (
    <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 hide-scrollbar snap-x">
      {[
        { id: 'appointment', label: 'نوبت جدید', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        { id: 'treatment', label: 'ثبت درمان', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        { id: 'payment', label: 'دریافت وجه', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        { id: 'lab', label: 'لابراتوار', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        { id: 'prescription', label: 'نسخه جدید', icon: Pill, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
      ].map(action => (
        <button
          key={action.id}
          className="flex flex-col items-center gap-2 min-w-[72px] snap-start shrink-0 group"
          onClick={() => {
             h.tap()
             if (action.id === 'appointment') setAppointmentModalOpen(true)
             if (action.id === 'treatment') { setMainTab('clinical'); setSubView('treatments'); setTimeout(() => setTreatmentModalOpen(true), 300) }
             if (action.id === 'payment') { setMainTab('finance_docs'); setSubView('payments'); setTimeout(() => setPaymentModalOpen(true), 300) }
             if (action.id === 'lab') navigate('/laboratory', { state: { quickStartPatientId: patient?.id } })
             if (action.id === 'prescription') { setMainTab('finance_docs'); setSubView('prescriptions'); setTimeout(() => setPrescriptionModalOpen(true), 300) }
          }}
        >
          <div className={\`w-14 h-14 rounded-full flex items-center justify-center \${action.bg} transition-transform active:scale-95 border border-white/50 shadow-sm dark:border-slate-800\`}>
             <action.icon className={action.color} size={24} strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  )

  const renderMainMenu = () => {
    const mainTabs = [
      { id: 'overview', label: 'نمای کلی' },
      { id: 'clinical', label: 'بالینی' },
      { id: 'appointments', label: 'نوبت‌ها' },
      { id: 'finance_docs', label: 'مالی و اسناد' },
    ] as const

    return (
      <div className="flex w-full border-b border-slate-200 dark:border-slate-800">
        {mainTabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              h.tap()
              setMainTab(t.id)
              setSubView(null)
            }}
            className={\`flex-1 py-3 text-[13px] font-bold border-b-2 transition-all \${
              mainTab === t.id 
                ? 'border-primary-500 text-primary-700 dark:text-primary-400' 
                : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }\`}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }

  const renderNestedMenu = (items: { id: string, label: string, icon: any, color: string, bg: string }[]) => {
    return (
      <div className="bg-white/50 dark:bg-slate-900/50 rounded-3xl p-2 space-y-1">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => {
              h.tap()
              setSubView(item.id)
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-colors active:scale-[0.98] shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
          >
            <div className={\`w-10 h-10 rounded-2xl flex items-center justify-center \${item.bg}\`}>
              <item.icon className={item.color} size={20} />
            </div>
            <span className="flex-1 text-right text-sm font-extrabold text-slate-800 dark:text-slate-200">
              {item.label}
            </span>
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
        ))}
      </div>
    )
  }

  // ===========================================================================
`;

content = content.replace("  // ===========================================================================\n  // Main Render", newHelpers + "\n  // Main Render");

// 4. Replace the old render block with the new architecture
const oldRenderBlockPattern = /\{\/\* Tabs \*\/\}.*?\{activeTab === 'documents' && renderDocuments\(\)\}/s;

const newRenderBlock = `{renderQuickActions()}

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden min-h-[500px]">
        {subView ? (
           <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
             <button onClick={() => { h.tap(); setSubView(null) }} className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-all">
               <ChevronRight size={22} />
             </button>
             <span className="font-extrabold text-lg text-slate-800 dark:text-slate-100">
               {tabs.find(t => t.id === subView)?.label || 'بازگشت'}
             </span>
           </div>
        ) : (
          renderMainMenu()
        )}

        <div className="p-3 sm:p-6">
          {!subView && mainTab === 'overview' && renderOverview()}
          {!subView && mainTab === 'appointments' && renderAppointments()}
          
          {!subView && mainTab === 'clinical' && renderNestedMenu([
            { id: 'teeth', label: 'چارت دندان', icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
            { id: 'treatments', label: 'درمان‌ها', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { id: 'implants', label: 'ایمپلنت‌ها', icon: Bone, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
            { id: 'perio', label: 'پریودنتال', icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
            { id: 'ortho', label: 'ارتودنسی', icon: Smile, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
            { id: 'phases', label: 'فازهای درمانی', icon: Layers, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
          ])}

          {!subView && mainTab === 'finance_docs' && renderNestedMenu([
            { id: 'payments', label: 'خلاصه مالی و پرداخت‌ها', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { id: 'documents', label: 'اسناد و مدارک', icon: ArchiveIcon, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
            { id: 'radiology', label: 'رادیولوژی و تصاویر', icon: ImageIcon, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
            { id: 'prescriptions', label: 'نسخه‌ها', icon: Pill, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
            { id: 'labOrders', label: 'سفارشات لابراتوار', icon: FlaskConical, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
            { id: 'consent', label: 'فرم‌های رضایت‌نامه', icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { id: 'insurance', label: 'بیمه', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' },
            { id: 'timeline', label: 'تایم‌لاین', icon: Clock, color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' },
          ])}

          {/* Sub Views */}
          {subView === 'timeline' && renderTimeline()}
          {subView === 'treatments' && renderTreatments()}
          {subView === 'implants' && renderImplants()}
          {subView === 'labOrders' && renderLabOrders()}
          {subView === 'phases' && renderPhases()}
          {subView === 'consent' && renderConsentForms()}
          {subView === 'appointments' && renderAppointments()}
          {subView === 'payments' && renderPayments()}
          {subView === 'teeth' && renderTeethChart()}
          {subView === 'perio' && (
            <PeriodontalChart
              patientId={patient.id}
              patientName={\`\${patient.first_name} \${patient.last_name}\`}
              doctors={doctors}
              exam={perioExams[0] || null}
              patient={patient}
              onSave={async (teethData, notes, docId) => {
                const payload = {
                  patient_id: patient.id,
                  doctor_id: docId,
                  exam_date: new Date().toISOString().slice(0, 10),
                  teeth_data: teethData,
                  notes,
                }
                if (perioExams[0]) {
                  await updatePerioExam(perioExams[0].id, payload)
                } else {
                  await createPerioExam(payload)
                }
                const updated = await fetchPerioExams(patient.id)
                setPerioExams(updated)
              }}
            />
          )}
          {subView === 'ortho' && (
            <OrthodonticChart
              patientId={patient.id}
              patientName={\`\${patient.first_name} \${patient.last_name}\`}
              doctors={doctors}
              exam={orthoExams[0] || null}
              patient={patient}
              onSave={async (examInput) => {
                if (orthoExams[0]) {
                  await updateOrthoExam(orthoExams[0].id, examInput)
                } else {
                  await createOrthoExam(examInput)
                }
                const updated = await fetchOrthoExams(patient.id)
                setOrthoExams(updated)
              }}
            />
          )}
          {subView === 'prescriptions' && renderPrescriptions()}
          {subView === 'radiology' && renderRadiology()}
          {subView === 'insurance' && (
            <PatientInsurance 
              patient={patient} 
              onSave={async (data) => {
                await updatePatient(patient.id, { insurance_info: data })
                const updated = await fetchPatient(patient.id)
                setPatient(updated)
              }} 
            />
          )}
          {subView === 'documents' && renderDocuments()}
        </div>
      </div>`;

content = content.replace(oldRenderBlockPattern, newRenderBlock);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactor complete!');
