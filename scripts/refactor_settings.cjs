const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/Settings.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace state
content = content.replace(
  "const [activeTab, setActiveTab] = useState('general')",
  "const [subView, setSubView] = useState<string | null>(null)"
);

content = content.replace("if (activeTab === 'updates') return", "if (subView === 'updates') return");
content = content.replace("if (canOpenSettingsSection(profile?.role, activeTab as SettingsSection)) return", "if (canOpenSettingsSection(profile?.role, subView as SettingsSection)) return");
content = content.replace("if (first) setActiveTab(first)", "// if (first) setSubView(first)");
content = content.replace("}, [profile?.role, activeTab])", "}, [profile?.role, subView])");

const renderSettingsMenuFn = 
`  const SETTINGS_GROUPS = [
    {
      title: 'کلینیک و سیستم',
      items: [
        { id: 'general', label: 'عمومی', icon: Building2, color: 'text-primary-600', bg: 'bg-primary-100 dark:bg-primary-900/30' },
        { id: 'doctors', label: 'پزشکان و یونیت‌ها', icon: Stethoscope, color: 'text-accent-600', bg: 'bg-accent-100 dark:bg-accent-900/30' },
        { id: 'rbac', label: 'دسترسی نقش‌ها', icon: Shield, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
        { id: 'file_number', label: 'شماره پرونده', icon: Hash, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
      ]
    },
    {
      title: 'بالینی و مالی',
      items: [
        { id: 'procedures', label: 'رویه‌ها', icon: ListOrdered, color: 'text-warning-600', bg: 'bg-warning-100 dark:bg-warning-900/30' },
        { id: 'packages', label: 'پکیج درمان', icon: Package, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
        { id: 'categories', label: 'دسته‌بندی انبار', icon: Tag, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        { id: 'pos', label: 'کارتخوان (PC-POS)', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
      ]
    },
    {
      title: 'امنیت و همگام‌سازی',
      items: [
        { id: 'app_lock', label: 'قفل امنیتی', icon: Fingerprint, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
        { id: 'backup', label: 'پشتیبان', icon: Cloud, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
        { id: 'failed_sync', label: 'همگام‌سازی ناموفق', icon: CloudOff, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
        { id: 'errors', label: 'گزارش خطاها', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
        { id: 'audit', label: 'گزارش فعالیت‌ها', icon: History, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
      ]
    },
    {
      title: 'ترجیحات دستگاه',
      items: [
        { id: 'appearance', label: 'ظاهر و شفافیت', icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
        { id: 'haptics', label: 'لرزش و صدا', icon: Vibrate, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
        { id: 'updates', label: 'به‌روزرسانی', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
      ]
    }
  ]

  const getActiveSettingsLabel = () => {
    for (const group of SETTINGS_GROUPS) {
      for (const item of group.items) {
        if (item.id === subView) return item.label
      }
    }
    return 'تنظیمات'
  }

  const renderSettingsMenu = () => {
    return (
      <div className="space-y-6 mt-6">
        {SETTINGS_GROUPS.map((group, i) => {
          const visibleItems = group.items.filter(item => 
            item.id === 'updates' || canOpenSettingsSection(profile?.role, item.id as SettingsSection)
          )
          
          if (visibleItems.length === 0) return null
          
          return (
            <div key={i} className="space-y-2">
              <h3 className="text-[13px] font-bold text-slate-500 dark:text-slate-400 px-4">{group.title}</h3>
              <div className="bg-white/70 dark:bg-slate-900/70 rounded-3xl p-2 space-y-1 shadow-sm border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md">
                {visibleItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      h.tap()
                      setSubView(item.id)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.98]"
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
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} /></div>

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {!subView ? (
        <>
          <div className="mb-6 px-2">
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">تنظیمات</h1>
            <p className="text-sm text-slate-500 mt-1">پیکربندی و مدیریت کلینیک</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-2">
            <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2"><Building2 size={16} className="text-primary-600" /><span className="text-xs font-bold text-slate-500">کلینیک</span></div>
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate">{generalForm.clinic_name || 'مینادنت'}</p>
            </div>
            <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2"><Stethoscope size={16} className="text-accent-600" /><span className="text-xs font-bold text-slate-500">پزشکان</span></div>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200">{toPersianDigits(stats.doctors)}</p>
            </div>
            <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2"><ListOrdered size={16} className="text-warning-600" /><span className="text-xs font-bold text-slate-500">رویه‌ها</span></div>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200">{toPersianDigits(stats.procedures)}</p>
            </div>
            <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2"><Database size={16} className="text-success-600" /><span className="text-xs font-bold text-slate-500">رکوردها</span></div>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200">{toPersianDigits(totalRecords)}</p>
            </div>
          </div>

          {renderSettingsMenu()}
        </>
      ) : (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 mb-6 px-2">
            <button
              onClick={() => { h.tap(); setSubView(null) }}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{getActiveSettingsLabel()}</h2>
          </div>
          
          <div className="space-y-4 px-2">
`;

const originalReturnStart = \`  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">تنظیمات</h1>
        <p className="text-xs text-slate-500 mt-0.5">پیکربندی و مدیریت کلینیک</p>
      </div>\`;

const tabsEnd = \`          t.key === 'updates' || canOpenSettingsSection(profile?.role, t.key as SettingsSection),
        )}
        active={activeTab}
        onChange={setActiveTab}
      />\`;

const startIdx = content.indexOf(originalReturnStart);
const endIdx = content.indexOf(tabsEnd, startIdx) + tabsEnd.length;

if (startIdx !== -1 && endIdx > startIdx) {
  content = content.substring(0, startIdx) + renderSettingsMenuFn + content.substring(endIdx);
} else {
  console.log("Could not find return/Tabs block");
}

// Replace activeTab with subView globally in the file for conditional rendering
// We just do it for all 'activeTab ==='
let tempContent = content.split("activeTab ===").join("subView ===");
tempContent = tempContent.split("activeTab === ").join("subView === ");
content = tempContent;

// Replace closing div
const finalClosingDiv = 
\`      {/* ───────────────────────────────────────────────────────────────── */}

    </div>
  )
}\`;

const newFinalClosingDiv = 
\`      {/* ───────────────────────────────────────────────────────────────── */}
          </div>
        </div>
      )}
    </div>
  )
}\`;

content = content.replace(finalClosingDiv, newFinalClosingDiv);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored Settings.tsx');
