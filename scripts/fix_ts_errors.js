import fs from 'fs';

const filePath = 'src/pages/PatientDetail.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace setActiveTab with switchTab
content = content.replace(/setActiveTab\(/g, "switchTab(");

// Define switchTab function right after mainTab definition
const mainTabDef = "const [subView, setSubView] = useState<string | null>(['overview', 'appointments'].includes(initial) ? null : initial)";
const switchTabDef = `const switchTab = (tab: string) => {
    setMainTab(getInitialMainTab(tab) as any)
    setSubView(['overview', 'appointments'].includes(tab) ? null : tab)
  }`;
content = content.replace(mainTabDef, mainTabDef + "\n  " + switchTabDef);

// Fix onClick handlers in Quick Actions
content = content.replace(/if \(action.id === 'appointment'\) setAppointmentModalOpen\(true\)/g, "if (action.id === 'appointment') { switchTab('appointments') }");
content = content.replace(/if \(action.id === 'treatment'\) \{ setMainTab\('clinical'\); setSubView\('treatments'\); setTimeout\(\(\) => setTreatmentModalOpen\(true\), 300\) \}/g, "if (action.id === 'treatment') { switchTab('treatments') }");
content = content.replace(/setTimeout\(\(\) => setPaymentModalOpen\(true\), 300\)/g, "setTimeout(() => handleOpenPaymentModal(), 300)");
content = content.replace(/if \(action.id === 'prescription'\) \{ setMainTab\('finance_docs'\); setSubView\('prescriptions'\); setTimeout\(\(\) => setPrescriptionModalOpen\(true\), 300\) \}/g, "if (action.id === 'prescription') { switchTab('prescriptions') }");

// Fix tabs.find t.id -> t.key
content = content.replace(/tabs\.find\(t => t\.id === subView\)/g, "tabs.find(t => t.key === subView)");

// Fix PatientInsurance
const patientInsuranceJSX = /\{subView === 'insurance' && \(\s*<PatientInsurance[\s\S]*?\/>\s*\)\}/;
content = content.replace(patientInsuranceJSX, "{subView === 'insurance' && renderInsurance()}");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed typescript errors!');
