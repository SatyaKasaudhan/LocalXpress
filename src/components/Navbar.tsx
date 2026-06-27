import { useState } from 'react';
import { ShoppingCart, Shield, Clock, Menu, X, Bell, User, Truck, Sun, Moon } from 'lucide-react';
import { isStoreOpen, getStoreStatusText } from '../utils';
import { UserRole, AppNotification } from '../types';
import LocalXpressLogo from './LocalXpressLogo';

interface NavbarProps {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  cartCount: number;
  onOpenCart: () => void;
  notifications: AppNotification[];
  onMarkNotificationsAsRead: () => void;
  onNavigateToSection: (sectionId: string) => void;
  activeSection: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  shopTitle?: string;
  serviceRadius?: string;
}

export default function Navbar({
  currentRole,
  setRole,
  cartCount,
  onOpenCart,
  notifications,
  onMarkNotificationsAsRead,
  onNavigateToSection,
  activeSection,
  isDarkMode,
  onToggleDarkMode,
  shopTitle = 'LOCAL XPRESS',
  serviceRadius = '5 KM',
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const isOpen = isStoreOpen();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNavClick = (sectionId: string) => {
    onNavigateToSection(sectionId);
    setMobileMenuOpen(false);
  };

  const roles: { value: UserRole; label: string; icon: string }[] = [
    { value: 'Customer', label: 'Customer View', icon: '👤' },
    { value: 'Staff', label: 'Staff Portal', icon: '🛠️' },
    { value: 'Admin', label: 'Admin Dashboard', icon: '👑' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shadow-xs no-print transition-colors duration-200">
      {/* Top Banner: Store Status & Role Quick-Selector */}
      <div className="bg-neutral-900 text-white text-[10px] sm:text-xs py-2 px-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 border-b border-neutral-800">
        <div className="flex items-center gap-1.5">
          <Clock className={`h-3.5 w-3.5 shrink-0 ${isOpen ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="font-display font-bold tracking-wider uppercase text-neutral-200">
            {getStoreStatusText()}
          </span>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap justify-center">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all px-2.5 py-1 rounded-lg text-neutral-200 cursor-pointer text-[10px] font-bold tracking-widest font-display min-h-[26px]"
            >
              <span className="opacity-75 hidden min-[480px]:inline">ROLE:</span>
              <span>{currentRole.toUpperCase()}</span>
              <span className="text-[8px] opacity-70">▼</span>
            </button>
            {roleMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setRoleMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        setRole(r.value);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer ${
                        currentRole === r.value ? 'bg-orange-50 dark:bg-orange-950/20 font-bold text-[#FF6321] dark:text-orange-400' : 'text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <span className="text-sm shrink-0">{r.icon}</span>
                      <span className="font-display font-semibold">{r.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span className="text-neutral-700 hidden sm:inline">|</span>
          <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase font-bold hidden xs:inline">
            ⚡ {serviceRadius} Delivery Radius
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center hover:opacity-95 transition-opacity cursor-pointer shrink-0"
        >
          <LocalXpressLogo className="h-8 sm:h-9.5 md:h-11" variant={isDarkMode ? 'white' : 'color'} />
        </button>

        {/* Desktop Customer Links */}
        {currentRole === 'Customer' ? (
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5">
            {['home', 'categories', 'featured', 'services', 'how-it-works', 'order-history', 'faq', 'contact'].map((section) => (
              <button
                key={section}
                onClick={() => handleNavClick(section)}
                className={`text-[11px] xl:text-xs font-bold tracking-wider font-display uppercase transition-colors duration-150 cursor-pointer hover:text-[#FF6321] whitespace-nowrap ${
                  activeSection === section ? 'text-[#FF6321]' : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {section.replace('-', ' ')}
              </button>
            ))}
          </nav>
        ) : (
          <div className="hidden lg:flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-1.5">
            <Shield className="h-3.5 w-3.5 text-[#FF6321] shrink-0" />
            <span className="text-[10px] font-mono font-bold text-neutral-300 uppercase tracking-widest">
              {currentRole} Dashboard Active
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 sm:p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            id="lx-theme-toggle-btn"
          >
            {isDarkMode ? (
              <Sun className="h-4.5 w-4.5 text-amber-400 animate-spin" style={{ animationDuration: '15s' }} />
            ) : (
              <Moon className="h-4.5 w-4.5 text-neutral-500 hover:text-neutral-800" />
            )}
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                onMarkNotificationsAsRead();
              }}
              className="p-2 sm:p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800 rounded-full transition-all duration-150 relative cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 bg-rose-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 z-50 py-2 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-neutral-50 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/40">
                    <span className="font-display font-semibold text-xs sm:text-sm text-neutral-800 dark:text-neutral-100">
                      Live Order Alerts
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                      Auto Play Active 🔊
                    </span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                      No new delivery alerts.
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-50 dark:divide-neutral-800/80">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer ${
                            !n.read ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{n.title}</p>
                            <span className="text-[8px] text-neutral-400 dark:text-neutral-500 font-mono whitespace-nowrap">
                              {n.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#FF6321] hover:bg-[#e04f14] text-white px-3 sm:px-4 py-2 rounded-xl transition-all duration-150 font-bold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-95 cursor-pointer text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]"
          >
            <ShoppingCart className="h-3.5 sm:h-4 sm:w-4" />
            <span className="hidden min-[480px]:inline">Cart</span>
            <span className="bg-white/20 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold">
              {cartCount}
            </span>
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 lg:hidden text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-xl transition-colors duration-150 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 top-[112px] bg-black/20 dark:bg-black/55 z-40 lg:hidden cursor-default" onClick={() => setMobileMenuOpen(false)} />
          <div className="lg:hidden border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-3 px-4 shadow-inner flex flex-col gap-2 relative z-50 animate-in slide-in-from-top duration-150">
            {currentRole === 'Customer' ? (
              <div className="grid grid-cols-2 gap-2 py-1.5">
                {['home', 'categories', 'featured', 'services', 'how-it-works', 'order-history', 'faq', 'contact'].map((section) => (
                  <button
                    key={section}
                    onClick={() => handleNavClick(section)}
                    className={`text-left py-2.5 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition capitalize flex items-center justify-between ${
                      activeSection === section
                        ? 'bg-orange-50 dark:bg-orange-950/20 text-[#FF6321] dark:text-orange-400 font-extrabold'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>{section.replace('-', ' ')}</span>
                    {activeSection === section && <span className="h-1.5 w-1.5 bg-[#FF6321] dark:bg-orange-500 rounded-full shrink-0" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl flex items-center gap-2.5 my-1">
                <Shield className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Logged in as {currentRole} Dashboard
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
