import React, { useState, useRef } from 'react';
import { 
  X, Bell, CheckCheck, Clock, MessageSquare, 
  FlaskConical, ShieldAlert, Sparkles, Send, CheckCircle2, ChevronLeft
} from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';
import { triggerHaptic } from '../utils/haptics';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToModule?: (viewId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

interface NotificationItem {
  id: string;
  category: 'urgent' | 'lab' | 'financial' | 'implant' | 'sync';
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  actionLabel?: string;
  actionModule?: string;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToModule,
  onUnreadCountChange
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'lab' | 'financial'>('all');
  const [sentToast, setSentToast] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const touchStartX = useRef<number>(0);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      category: 'urgent',
      title: 'اعلام پایان جراحی یونیت ۱ توسط دکتر امیری',
      description: 'بیمار خانم سارا رضایی، جراحی فیکسچر ایمپلنت ناحیه LL6 تمام شد. آماده تسویه حساب در میز منشی.',
      time: 'هم‌اکنون',
      isRead: false,
      actionLabel: 'ثبت تسویه حساب (POS)',
      actionModule: 'financial'
    },
    {
      id: 'n2',
      category: 'lab',
      title: 'تحویل کار لابراتوار دندانسازی صبا',
      description: 'روکش زیرکونیا دندان ۳۵ آقای علی مرادی به مطب رسید. بیمار فردا ساعت ۱۷ نوبت تحویل دارد.',
      time: '۱۰ دقیقه پیش',
      isRead: false,
      actionLabel: 'ارسال پیامک اطلاع‌رسانی بیمار',
      actionModule: 'lab'
    },
    {
      id: 'n3',
      category: 'financial',
      title: 'سررسید نزدیک چک صیادی (۱۰,۰۰۰,۰۰۰ تومان)',
      description: 'چک صیادی بابت ارتودنسی خانم کیانی، ۳ روز دیگر سررسید می‌شود. بانک سامان.',
      time: 'امروز ۰۹:۳۰',
      isRead: false,
      actionLabel: 'ارسال پیامک یادآوری وصول',
      actionModule: 'financial'
    },
    {
      id: 'n4',
      category: 'implant',
      title: 'موعد هیلینگ کپ (Healing Abutment)',
      description: 'دوره اسئواینتگریشن فیکسچر بیمار محمد کاظمی به پایان رسیده و آماده فاز پروتزی است.',
      time: 'دیروز ۱۸:۰۰',
      isRead: true,
      actionLabel: 'رزرو نوبت پروتز',
      actionModule: 'appointments'
    },
    {
      id: 'n5',
      category: 'sync',
      title: 'پشتیبان‌گیری و همگام‌سازی ابری خودکار',
      description: 'کلیه رکوردهای دیتابیس لوکال کلینیک با فضای ابری مینادنتال در ساعت ۱۲:۰۰ با موفقیت سینک شد.',
      time: 'امروز ۱۲:۰۰',
      isRead: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const lastReportedCount = React.useRef<number>(unreadCount);

  React.useEffect(() => {
    if (onUnreadCountChange && lastReportedCount.current !== unreadCount) {
      lastReportedCount.current = unreadCount;
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    return n.category === activeTab;
  });

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleAddTestNotification = () => {
    const newNotif: NotificationItem = {
      id: `n-${Date.now()}`,
      category: 'urgent',
      title: 'پیام فوری یونیت دندانپزشکی',
      description: 'بیمار جدید در صف انتظار پذیرش شد. لطفا اقدامات لازم را بررسی نمایید.',
      time: 'لحظاتی پیش',
      isRead: false,
      actionLabel: 'مشاهده بیماران',
      actionModule: 'patients'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAction = (item: NotificationItem) => {
    // mark read
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    
    if (item.actionLabel?.includes('پیامک')) {
      setSentToast(`پیامک خودکار برای بیمار با موفقیت ارسال گردید.`);
      setTimeout(() => setSentToast(null), 3500);
      return;
    }

    if (item.actionModule && onNavigateToModule) {
      onClose();
      onNavigateToModule(item.actionModule);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    if (diff > 0) {
      setDragOffset(diff);
    } else {
      setDragOffset(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (dragOffset > 70) {
      triggerHaptic('gesture');
      onClose();
    }
    setDragOffset(0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Blurred Backdrop - Soft Emerald Tint */}
      <div 
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
        className="absolute inset-0 bg-emerald-950/20 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over panel from side (Right in RTL = smooth slide from right) */}
      <div 
        className="absolute inset-y-0 right-0 max-w-full flex pl-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* iOS 27 Subtle Vertical Drag Grabber Bar */}
        <div className="flex items-center justify-center pr-1.5">
          <div className="w-1.5 h-12 bg-slate-300/80 hover:bg-slate-400 rounded-full cursor-grab active:cursor-grabbing transition-colors" />
        </div>

        <div 
          style={{
            transform: dragOffset > 0 ? `translateX(${dragOffset}px)` : undefined,
            transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
          }}
          className="w-screen max-w-sm sm:max-w-md bg-white border-l border-slate-200 text-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ease-out"
        >
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white shadow-xs">
                <Bell className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">مرکز اعلانات و یادآوری‌ها</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      {toPersianDigits(unreadCount)} جدید
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                  کلینیک تخصصی مینادنتال · سینک هوشمند
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    triggerHaptic('success');
                    handleMarkAllRead();
                  }}
                  className="p-1.5 text-xs text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-100/60 transition-colors"
                  title="خواندن همه"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition-all"
                aria-label="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Category Filter Tabs */}
          <div className="p-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('all');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              همه ({toPersianDigits(notifications.length)})
            </button>

            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('urgent');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeTab === 'urgent'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              فوری پزشک
            </button>

            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('lab');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeTab === 'lab'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              لابراتوار
            </button>

            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('financial');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeTab === 'financial'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              چک و مالی
            </button>
          </div>

          {/* Notification Toast Message */}
          {sentToast && (
            <div className="m-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{sentToast}</span>
            </div>
          )}

          {/* Notifications Scrollable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                <Sparkles className="w-8 h-8 mb-2 text-slate-300" />
                <span>هیچ اعلان جدیدی در این بخش وجود ندارد.</span>
              </div>
            ) : (
              filtered.map(item => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-3 border transition-all ${
                    item.isRead
                      ? 'bg-white border-slate-200 text-slate-600'
                      : item.category === 'urgent'
                      ? 'bg-red-50 border-red-200 text-slate-900 shadow-xs'
                      : 'bg-white border-emerald-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        item.isRead ? 'bg-slate-300' : 'bg-emerald-500 animate-pulse'
                      }`} />
                      <h4 className="text-xs font-extrabold leading-snug">
                        {item.title}
                      </h4>
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed pr-4 mb-2.5">
                    {item.description}
                  </p>

                  {item.actionLabel && (
                    <div className="flex justify-end pt-1 pr-4 border-t border-slate-100">
                      <button
                        onClick={() => handleAction(item)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all ${
                          item.category === 'urgent'
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xs'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        }`}
                      >
                        {item.actionLabel.includes('پیامک') ? (
                          <Send className="w-3.5 h-3.5 -scale-x-100" />
                        ) : (
                          <ChevronLeft className="w-3.5 h-3.5" />
                        )}
                        <span>{item.actionLabel}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Drawer Bottom Status & Test Trigger */}
          <div className="p-3 border-t border-slate-200 bg-white text-[10px] text-slate-500 flex items-center justify-between px-3">
            <button
              onClick={handleAddTestNotification}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 active:scale-95"
            >
              <span>+ تست اعلان جدید</span>
            </button>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              سینک زنده سوپابیس
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
