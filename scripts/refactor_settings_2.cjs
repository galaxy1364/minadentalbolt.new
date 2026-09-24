const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/Settings.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace state
content = content.replace(
  "const [activeTab, setActiveTab] = useState('general')",
  "const [subView, setSubView] = useState<string | null>(null)"
);

// 2. Replace references to activeTab in the useEffect
content = content.replace(/activeTab === 'updates'/g, "subView === 'updates'");
content = content.replace(/activeTab as SettingsSection/g, "subView as SettingsSection");
content = content.replace(/\\[profile\?\\.role, activeTab\\]/g, "[profile?.role, subView]");
content = content.replace(/setActiveTab\(first\)/g, "// setSubView(first)");

// 3. Define the menu configuration
const renderSettingsMenuFn = 
  "  const SETTINGS_GROUPS = [\n" +
  "    {\n" +
  "      title: 'کلینیک و سیستم',\n" +
  "      items: [\n" +
  "        { id: 'general', label: 'عمومی', icon: Building2, color: 'text-primary-600', bg: 'bg-primary-100 dark:bg-primary-900/30' },\n" +
  "        { id: 'doctors', label: 'پزشکان و یونیت‌ها', icon: Stethoscope, color: 'text-accent-600', bg: 'bg-accent-100 dark:bg-accent-900/30' },\n" +
  "        { id: 'rbac', label: 'دسترسی نقش‌ها', icon: Shield, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },\n" +
  "        { id: 'file_number', label: 'شماره پرونده', icon: Hash, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },\n" +
  "      ]\n" +
  "    },\n" +
  "    {\n" +
  "      title: 'بالینی و مالی',\n" +
  "      items: [\n" +
  "        { id: 'procedures', label: 'رویه‌ها', icon: ListOrdered, color: 'text-warning-600', bg: 'bg-warning-100 dark:bg-warning-900/30' },\n" +
  "        { id: 'packages', label: 'پکیج درمان', icon: Package, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },\n" +
  "        { id: 'categories', label: 'دسته‌بندی انبار', icon: Tag, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },\n" +
  "        { id: 'pos', label: 'کارتخوان (PC-POS)', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },\n" +
  "      ]\n" +
  "    },\n" +
  "    {\n" +
  "      title: 'امنیت و همگام‌سازی',\n" +
  "      items: [\n" +
  "        { id: 'app_lock', label: 'قفل امنیتی', icon: Fingerprint, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },\n" +
  "        { id: 'backup', label: 'پشتیبان', icon: Cloud, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },\n" +
  "        { id: 'failed_sync', label: 'همگام‌سازی ناموفق', icon: CloudOff, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },\n" +
  "        { id: 'errors', label: 'گزارش خطاها', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },\n" +
  "        { id: 'audit', label: 'گزارش فعالیت‌ها', icon: History, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },\n" +
  "      ]\n" +
  "    },\n" +
  "    {\n" +
  "      title: 'ترجیحات دستگاه',\n" +
  "      items: [\n" +
  "        { id: 'appearance', label: 'ظاهر و شفافیت', icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },\n" +
  "        { id: 'haptics', label: 'لرزش و صدا', icon: Vibrate, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },\n" +
  "        { id: 'updates', label: 'به‌روزرسانی', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },\n" +
  "      ]\n" +
  "    }\n" +
  "  ]\n\n" +
  "  const getActiveSettingsLabel = () => {\n" +
  "    for (const group of SETTINGS_GROUPS) {\n" +
  "      for (const item of group.items) {\n" +
  "        if (item.id === subView) return item.label\n" +
  "      }\n" +
  "    }\n" +
  "    return 'تنظیمات'\n" +
  "  }\n\n" +
  "  const renderSettingsMenu = () => {\n" +
  "    return (\n" +
  "      <div className=\"space-y-6 mt-6\">\n" +
  "        {SETTINGS_GROUPS.map((group, i) => {\n" +
  "          const visibleItems = group.items.filter(item => \n" +
  "            item.id === 'updates' || canOpenSettingsSection(profile?.role, item.id as SettingsSection)\n" +
  "          )\n" +
  "          \n" +
  "          if (visibleItems.length === 0) return null\n" +
  "          \n" +
  "          return (\n" +
  "            <div key={i} className=\"space-y-2\">\n" +
  "              <h3 className=\"text-[13px] font-bold text-slate-500 dark:text-slate-400 px-4\">{group.title}</h3>\n" +
  "              <div className=\"bg-white/70 dark:bg-slate-900/70 rounded-3xl p-2 space-y-1 shadow-sm border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md\">\n" +
  "                {visibleItems.map(item => (\n" +
  "                  <button\n" +
  "                    key={item.id}\n" +
  "                    onClick={() => {\n" +
  "                      h.tap()\n" +
  "                      setSubView(item.id)\n" +
  "                    }}\n" +
  "                    className=\"w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-[0.98]\"\n" +
  "                  >\n" +
  "                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.bg}`}>\n" +
  "                      <item.icon className={item.color} size={20} />\n" +
  "                    </div>\n" +
  "                    <span className=\"flex-1 text-right text-sm font-extrabold text-slate-800 dark:text-slate-200\">\n" +
  "                      {item.label}\n" +
  "                    </span>\n" +
  "                    <ChevronLeft size={20} className=\"text-slate-400\" />\n" +
  "                  </button>\n" +
  "                ))}\n" +
  "              </div>\n" +
  "            </div>\n" +
  "          )\n" +
  "        })}\n" +
  "      </div>\n" +
  "    )\n" +
  "  }\n";

content = content.replace('return (', renderSettingsMenuFn + '\n  return (');

const targetStr = 'return (\n    <div className="space-y-4 max-w-2xl mx-auto">';
const index = content.indexOf('return (\n    <div className="space-y-4 max-w-2xl mx-auto">');

if (index !== -1) {
  const tabsStart = content.indexOf('<Tabs', index);
  const tabsEnd = content.indexOf('/>', tabsStart) + 2;

  const beforeTabs = content.substring(index, tabsStart);
  let afterTabs = content.substring(tabsEnd);

  afterTabs = afterTabs.replace(/activeTab ===/g, 'subView ===');

  const newReturn = 
    "return (\n" +
    "    <div className=\"max-w-2xl mx-auto pb-24\">\n" +
    "      {!subView ? (\n" +
    "        <>\n" +
    "          <div className=\"mb-6 px-2\">\n" +
    "            <h1 className=\"text-2xl font-extrabold text-slate-800 dark:text-slate-100\">تنظیمات</h1>\n" +
    "            <p className=\"text-sm text-slate-500 mt-1\">پیکربندی و مدیریت کلینیک</p>\n" +
    "          </div>\n" +
    "          \n" +
    "          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-3 px-2\">\n" +
    "            <div className=\"p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md\">\n" +
    "              <div className=\"flex items-center gap-1.5 mb-2\"><Building2 size={16} className=\"text-primary-600\" /><span className=\"text-xs font-bold text-slate-500\">کلینیک</span></div>\n" +
    "              <p className=\"text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate\">{generalForm.clinic_name || 'مینادنت'}</p>\n" +
    "            </div>\n" +
    "            <div className=\"p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md\">\n" +
    "              <div className=\"flex items-center gap-1.5 mb-2\"><Stethoscope size={16} className=\"text-accent-600\" /><span className=\"text-xs font-bold text-slate-500\">پزشکان</span></div>\n" +
    "              <p className=\"text-xl font-black text-slate-800 dark:text-slate-200\">{toPersianDigits(stats.doctors)}</p>\n" +
    "            </div>\n" +
    "            <div className=\"p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md\">\n" +
    "              <div className=\"flex items-center gap-1.5 mb-2\"><ListOrdered size={16} className=\"text-warning-600\" /><span className=\"text-xs font-bold text-slate-500\">رویه‌ها</span></div>\n" +
    "              <p className=\"text-xl font-black text-slate-800 dark:text-slate-200\">{toPersianDigits(stats.procedures)}</p>\n" +
    "            </div>\n" +
    "            <div className=\"p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md\">\n" +
    "              <div className=\"flex items-center gap-1.5 mb-2\"><Database size={16} className=\"text-success-600\" /><span className=\"text-xs font-bold text-slate-500\">رکوردها</span></div>\n" +
    "              <p className=\"text-xl font-black text-slate-800 dark:text-slate-200\">{toPersianDigits(totalRecords)}</p>\n" +
    "            </div>\n" +
    "          </div>\n" +
    "          \n" +
    "          {renderSettingsMenu()}\n" +
    "        </>\n" +
    "      ) : (\n" +
    "        <div className=\"animate-in slide-in-from-right-4 fade-in duration-300\">\n" +
    "          <div className=\"flex items-center gap-3 mb-6 px-2\">\n" +
    "            <button\n" +
    "              onClick={() => { h.tap(); setSubView(null) }}\n" +
    "              className=\"w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors\"\n" +
    "            >\n" +
    "              <ChevronRight size={20} />\n" +
    "            </button>\n" +
    "            <h2 className=\"text-xl font-extrabold text-slate-800 dark:text-slate-100\">{getActiveSettingsLabel()}</h2>\n" +
    "          </div>\n" +
    "          \n" +
    "          <div className=\"space-y-4 px-2\">\n";

  let finalReturn = afterTabs;
  // Use lastIndexOf and slice to replace the final closing tags
  const lastIndex = finalReturn.lastIndexOf('</div>\n  )');
  if (lastIndex !== -1) {
    finalReturn = finalReturn.substring(0, lastIndex) + '</div>\n      )}\n    </div>\n  )';
  } else {
    // fallback if formatting is slightly different
    finalReturn = finalReturn.substring(0, finalReturn.lastIndexOf('</div>')) + '</div>\n      )}\n    </div>\n  )';
  }

  content = content.substring(0, index) + newReturn + finalReturn;
} else {
  console.log("Could not find start pattern!");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored Settings.tsx');
