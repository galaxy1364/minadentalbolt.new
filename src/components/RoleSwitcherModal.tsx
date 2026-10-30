import React, { useState } from 'react';
import { UserAccount, PlatformDevice, RoleType } from '../types/dental';
import { 
  X, UserCheck, Smartphone, Monitor, Tablet, Plus, Shield, 
  CheckCircle2, RefreshCw, Key, Mail, Lock, UserPlus, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  users: UserAccount[];
  platforms: PlatformDevice[];
  onSwitchUser: (user: UserAccount) => void;
  onAddPlatform: (platform: PlatformDevice) => void;
  onAddUser?: (user: UserAccount) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  platforms,
  onSwitchUser,
  onAddPlatform,
  onAddUser
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'login' | 'add_user' | 'platforms'>('roles');
  
  // Platform creation state
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>('tablet');
  const [newAssignedUser, setNewAssignedUser] = useState(users[0]?.username || 'monshi');

  // Email & Password login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // New Staff / Doctor Form state
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleType>('doctor');
  const [newPlatform, setNewPlatform] = useState('یونیت ۲ دندانپزشکی');
  const [newLicense, setNewLicense] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [permAppointments, setPermAppointments] = useState(true);
  const [permTreatments, setPermTreatments] = useState(true);
  const [permPayments, setPermPayments] = useState(false);
  const [permChecks, setPermChecks] = useState(false);
  const [permSettings, setPermSettings] = useState(false);
  const [permBackup, setPermBackup] = useState(true);

  if (!isOpen) return null;

  const handleCreatePlatform = () => {
    if (!newDeviceName) return;
    triggerHaptic('success');
    const user = users.find(u => u.username === newAssignedUser) || users[0];
    onAddPlatform({
      id: `dev-${Date.now()}`,
      deviceName: newDeviceName,
      deviceType: newDeviceType,
      assignedRole: user.role,
      assignedUser: user.fullName,
      lastSyncTime: 'همین الان (آنلاین)',
      isOnline: true
    });
    setNewDeviceName('');
  };

  const handleEmailPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPassword.trim();

    if (!emailTrim || !passTrim) {
      setLoginError('لطفاً ایمیل و کلمه عبور را وارد نمایید.');
      triggerHaptic('warning');
      return;
    }

    // Match by email or username
    const matched = users.find(u => 
      (u.email && u.email.toLowerCase() === emailTrim) || 
      (u.username && u.username.toLowerCase() === emailTrim)
    );

    if (!matched) {
      setLoginError('کاربری با این مشخصات یافت نشد.');
      triggerHaptic('warning');
      return;
    }

    // Password verification
    if (matched.password && matched.password !== passTrim) {
      setLoginError('کلمه عبور وارد شده نادرست است.');
      triggerHaptic('warning');
      return;
    }

    triggerHaptic('success');
    setLoginSuccess(`خوش آمدید، ${matched.fullName}`);
    setTimeout(() => {
      onSwitchUser(matched);
      onClose();
    }, 700);
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newPassword) {
      triggerHaptic('warning');
      return;
    }

    const generatedUsername = newUsername.trim() || newEmail.split('@')[0] || `user_${Date.now()}`;
    const roleColors: Record<RoleType, string> = {
      admin: '#c8ff00',
      doctor: '#10b981',
      secretary: '#f59e0b',
      accountant: '#8b5cf6',
      assistant: '#14b8a6',
      lab_tech: '#06b6d4'
    };

    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      fullName: newFullName,
      username: generatedUsername,
      email: newEmail,
      password: newPassword,
      role: newRole,
      assignedPlatform: newPlatform,
      avatarColor: roleColors[newRole],
      phone: newPhone || '۰۹۱۲۰۰۰۰۰۰۰',
      medicalLicense: newLicense || undefined,
      isActive: true,
      permissions: {
        canManageAppointments: permAppointments,
        canRegisterTreatments: permTreatments,
        canCollectPayments: permPayments,
        canManageChecks: permChecks,
        canAccessSettingsAndUsers: permSettings,
        canBackupAndRestore: permBackup
      }
    };

    triggerHaptic('success');
    if (onAddUser) {
      onAddUser(newUser);
    }
    setActiveTab('roles');
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-950/30 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-gradient-to-b from-emerald-50/95 via-white to-sky-50/60 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-emerald-200/90 p-4 sm:p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">مدیریت پرسنل، پزشکان و سطوح دسترسی</h3>
              <p className="text-[11px] text-emerald-800 font-bold">کاربر فعال: {currentUser.fullName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px]">
          <button
            onClick={() => { triggerHaptic('selection'); setActiveTab('roles'); }}
            className={`py-1.5 rounded-lg font-bold transition-all ${activeTab === 'roles' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            سوئیچ سریع
          </button>
          <button
            onClick={() => { triggerHaptic('selection'); setActiveTab('login'); }}
            className={`py-1.5 rounded-lg font-bold transition-all ${activeTab === 'login' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            ورود با ایمیل
          </button>
          <button
            onClick={() => { triggerHaptic('selection'); setActiveTab('add_user'); }}
            className={`py-1.5 rounded-lg font-bold transition-all ${activeTab === 'add_user' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            + تعریف پرسنل
          </button>
          <button
            onClick={() => { triggerHaptic('selection'); setActiveTab('platforms'); }}
            className={`py-1.5 rounded-lg font-bold transition-all ${activeTab === 'platforms' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            پلتفرم‌ها ({platforms.length})
          </button>
        </div>

        {/* TAB 1: Role Switcher */}
        {activeTab === 'roles' && (
          <div className="space-y-2.5">
            <span className="text-xs text-slate-600 font-bold block">
              برای آزمایش همگام‌سازی بین منشی و پزشک، روی کاربر مورد نظر کلیک کنید:
            </span>

            {users.map(user => {
              const isSelected = user.id === currentUser.id;

              return (
                <div
                  key={user.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    onSwitchUser(user);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm text-black shadow-xs shrink-0"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.role === 'admin' ? 'مدیر' : user.role === 'doctor' ? 'پزشک' : user.role === 'secretary' ? 'منشی' : 'مالی'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900">{user.fullName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">@{user.username}</span>
                      </div>
                      <div className="text-[10.5px] text-emerald-800 font-bold mt-0.5 flex items-center gap-1.5">
                        <span>{user.assignedPlatform}</span>
                        {user.email && <span className="text-[9.5px] text-slate-500 font-mono">({user.email})</span>}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                      فعال هم‌اکنون
                    </span>
                  )}
                </div>
              );
            })}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">مجوزهای نقش فعال ({currentUser.fullName}):</span>
              <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                <span className={currentUser.permissions.canManageAppointments ? 'text-emerald-700 font-bold' : 'text-red-600 font-medium'}>
                  {currentUser.permissions.canManageAppointments ? '✓ ثبت و تغییر نوبت‌ها' : '✕ ثبت نوبت'}
                </span>
                <span className={currentUser.permissions.canRegisterTreatments ? 'text-emerald-700 font-bold' : 'text-red-600 font-medium'}>
                  {currentUser.permissions.canRegisterTreatments ? '✓ ثبت درمان در یونیت' : '✕ ثبت درمان'}
                </span>
                <span className={currentUser.permissions.canCollectPayments ? 'text-emerald-700 font-bold' : 'text-red-600 font-medium'}>
                  {currentUser.permissions.canCollectPayments ? '✓ صندوق و دریافت وجه' : '✕ دریافت وجه'}
                </span>
                <span className={currentUser.permissions.canAccessSettingsAndUsers ? 'text-emerald-700 font-bold' : 'text-red-600 font-medium'}>
                  {currentUser.permissions.canAccessSettingsAndUsers ? '✓ تعریف کاربران و پلتفرم' : '✕ دسترسی تنظیمات'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Login with Email & Password */}
        {activeTab === 'login' && (
          <form onSubmit={handleEmailPasswordLogin} className="space-y-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Key className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-800">ورود امن پرسنل و پزشک با ایمیل شخصی</span>
            </div>

            {loginError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {loginSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{loginSuccess}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>ایمیل یا نام کاربری:</span>
              </label>
              <input
                type="text"
                placeholder="مثلاً: mehdi.amiri19851364@gmail.com یا dr_amiri"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>کلمه عبور اختصاصی:</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="رمز عبور خود را وارد کنید"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 pl-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mt-2"
            >
              احراز هویت و ورود به سامانه
            </button>

            {/* Quick Helper Credentials */}
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">اکانت‌های پیش‌فرض تست سریع:</span>
              <div className="grid grid-cols-2 gap-1 font-mono">
                <div 
                  onClick={() => { setLoginEmail('mehdi.amiri19851364@gmail.com'); setLoginPassword('amiri@dental2025'); }}
                  className="p-1.5 bg-slate-100 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                >
                  دکتر امیری: <span className="text-emerald-700">amiri@dental2025</span>
                </div>
                <div 
                  onClick={() => { setLoginEmail('secretary@minadental.com'); setLoginPassword('monshi@mina2025'); }}
                  className="p-1.5 bg-slate-100 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                >
                  منشی: <span className="text-amber-700">monshi@mina2025</span>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: Add New Staff Member / Doctor */}
        {activeTab === 'add_user' && (
          <form onSubmit={handleCreateNewUser} className="space-y-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-xs">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-800">تعریف عضو جدید کادر درمان و تعیین رمز عبور</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  placeholder="دکتر سارا حسینی"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">نقش سازمانی:</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as RoleType;
                    setNewRole(r);
                    if (r === 'doctor') {
                      setPermTreatments(true);
                      setPermAppointments(true);
                      setPermPayments(false);
                      setPermChecks(false);
                    } else if (r === 'secretary') {
                      setPermTreatments(false);
                      setPermAppointments(true);
                      setPermPayments(true);
                      setPermChecks(true);
                    } else if (r === 'accountant') {
                      setPermTreatments(false);
                      setPermAppointments(false);
                      setPermPayments(true);
                      setPermChecks(true);
                    } else {
                      setPermTreatments(true);
                      setPermAppointments(true);
                      setPermPayments(true);
                      setPermChecks(true);
                      setPermSettings(true);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="doctor">دندانپزشک معالج</option>
                  <option value="secretary">منشی و پذیرش</option>
                  <option value="accountant">امور مالی و حسابدار</option>
                  <option value="admin">مدیر ارشد کلینیک</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">ایمیل رسمی (جهت ورود):</label>
                <input
                  type="email"
                  placeholder="doctor@minadental.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  dir="ltr"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">کلمه عبور اولیه:</label>
                <input
                  type="text"
                  placeholder="رمز عبور شخصی"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  dir="ltr"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">یونیت یا پلتفرم پیش‌فرض:</label>
                <input
                  type="text"
                  placeholder="یونیت ۲ دندانپزشکی"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">شماره نظام پزشکی (اختیاری):</label>
                <input
                  type="text"
                  placeholder="مثلاً: ۲۰۳۴۱-م"
                  value={newLicense}
                  onChange={(e) => setNewLicense(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Granular Permissions */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-800 block">تفکیک سطوح دسترسی (RBAC):</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permAppointments}
                    onChange={(e) => setPermAppointments(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>مدیریت نوبت‌دهی</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permTreatments}
                    onChange={(e) => setPermTreatments(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>ثبت طرح درمان یونیت</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permPayments}
                    onChange={(e) => setPermPayments(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>صندوق و دریافت وجه</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permChecks}
                    onChange={(e) => setPermChecks(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>مدیریت چک صیاد و اقساط</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              ثبت پرسنل و اعطای دسترسی به کلینیک
            </button>
          </form>
        )}

        {/* TAB 4: Connected Platforms */}
        {activeTab === 'platforms' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-600 font-bold block">
              پلتفرم‌ها و دستگاه‌های فعال تعریف شده توسط مدیر کلینیک:
            </span>

            <div className="space-y-2">
              {platforms.map(p => (
                <div key={p.id} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                      {p.deviceType === 'desktop' ? <Monitor className="w-4 h-4" /> :
                       p.deviceType === 'tablet' ? <Tablet className="w-4 h-4" /> :
                       <Smartphone className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{p.deviceName}</span>
                      <span className="text-[10px] text-slate-500 font-medium">کاربر: {p.assignedUser}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      آنلاین و سینک
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{p.lastSyncTime}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add platform form */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-black text-slate-800 text-xs block">+ تعریف پلتفرم / دستگاه جدید</span>
              <input
                type="text"
                placeholder="نام دستگاه مثلاً: تبلت یونیت ۲"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800"
                >
                  <option value="desktop">ویندوز / دسکتاپ</option>
                  <option value="tablet">آیپد / تبلت</option>
                  <option value="mobile">موبایل هوشمند</option>
                </select>

                <select
                  value={newAssignedUser}
                  onChange={(e) => setNewAssignedUser(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.username}>{u.fullName}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreatePlatform}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all mt-1"
              >
                افزودن دستگاه به شبکه کلینیک
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
