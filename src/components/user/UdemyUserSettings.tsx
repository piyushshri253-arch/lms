'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export type SettingsTab =
  | 'profile'
  | 'photo'
  | 'account-security'
  | 'subscriptions'
  | 'payment-methods'
  | 'privacy'
  | 'notifications'
  | 'api-clients'
  | 'close-account';

interface UdemyUserSettingsProps {
  initialTab?: SettingsTab;
}

export function UdemyUserSettings({ initialTab = 'account-security' }: UdemyUserSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, showToast, refreshUser, logout } = useApp();

  // Tab State
  const queryTab = searchParams?.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(queryTab || initialTab);

  useEffect(() => {
    if (queryTab && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  // Profile fields
  const [fullName, setFullName] = useState(currentUser?.name || 'Student Learner');
  const [headline, setHeadline] = useState('Enthusiastic Learner & Professional Student');
  const [bio, setBio] = useState('Dedicated to continuous growth, mastering new skills, and advancing through interactive learning on Morena Teach.');
  const [language, setLanguage] = useState('English (US)');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [youtube, setYoutube] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (currentUser?.name) {
      setFullName(currentUser.name);
    }
    if (currentUser?.avatar) {
      setAvatarUrl(currentUser.avatar);
    }
    if (currentUser?.phone) {
      setPhone(currentUser.phone);
      setPhoneInput(currentUser.phone);
    }
  }, [currentUser]);

  // Photo
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Phone fields
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || '');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // MFA fields
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isEnablingMfa, setIsEnablingMfa] = useState(false);

  // Privacy fields
  const [showProfileToLoggedUsers, setShowProfileToLoggedUsers] = useState(true);
  const [showCoursesOnProfile, setShowCoursesOnProfile] = useState(true);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Notifications fields
  const [emailPromotions, setEmailPromotions] = useState(true);
  const [emailAnnouncements, setEmailAnnouncements] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(true);
  const [emailSecurityAlerts, setEmailSecurityAlerts] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Close account modal
  const [isCloseAccountModalOpen, setIsCloseAccountModalOpen] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [isClosingAccount, setIsClosingAccount] = useState(false);

  // Public Profile View Modal
  const [isPublicProfileModalOpen, setIsPublicProfileModalOpen] = useState(false);

  // Payment Methods state
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'upi'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [savedCards, setSavedCards] = useState([
    { id: '1', brand: 'Visa', last4: '4242', exp: '12/28', default: true }
  ]);

  // Sync profile when currentUser updates
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setFullName(currentUser.name);
      if (currentUser.avatar) setAvatarUrl(currentUser.avatar);
      if (currentUser.phone) {
        setPhone(currentUser.phone);
        setPhoneInput(currentUser.phone);
      }
      if (currentUser.bio) setBio(currentUser.bio);
    }
  }, [currentUser]);

  // Fetch real notification preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/auth/notification-preferences');
        if (res.ok) {
          const data = await res.json();
          if (data?.preferences) {
            setEmailPromotions(data.preferences.emailPromotions ?? true);
            setEmailAnnouncements(data.preferences.emailCourseUpdates ?? true);
            setEmailSecurityAlerts(data.preferences.emailSecurityAlerts ?? true);
          }
        }
      } catch (err) {
        // Silently ignore or use defaults
      }
    }
    loadPreferences();
  }, []);

  // Compute initials
  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PS';

  // Switch tab helper
  const handleTabChange = (tab: SettingsTab, href?: string) => {
    setActiveTab(tab);
    if (href) {
      router.push(href);
    }
  };

  // 1. Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          bio,
          avatar: avatarUrl
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update profile');
      }
      await refreshUser();
      showToast({
        title: 'Profile Updated',
        description: 'Your public profile details have been saved.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Save Failed',
        description: err.message || 'Could not save profile.',
        type: 'error'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Photo Upload Simulation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAvatarUrl(base64);
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64 })
        });
        await refreshUser();
        showToast({
          title: 'Photo Uploaded',
          description: 'Your new profile photo is active.',
          type: 'success'
        });
      } catch (err) {
        showToast({
          title: 'Upload Error',
          description: 'Failed to update photo.',
          type: 'error'
        });
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast({
        title: 'Password Changed',
        description: 'You can now sign in with your new password.',
        type: 'success'
      });
    } catch (err: any) {
      setPasswordError(err.message || 'Error changing password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 4. Phone Save
  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPhone(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update phone number');
      }
      setPhone(phoneInput);
      setIsEditingPhone(false);
      await refreshUser();
      showToast({
        title: 'Phone Number Saved',
        description: 'Your phone number has been updated.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err.message || 'Failed to save phone.',
        type: 'error'
      });
    } finally {
      setIsSavingPhone(false);
    }
  };

  // 5. MFA Enable / Verify
  const handleConfirmMfa = async () => {
    setIsEnablingMfa(true);
    try {
      // Simulate MFA OTP check
      await new Promise((r) => setTimeout(r, 600));
      setMfaEnabled(true);
      setIsMfaModalOpen(false);
      setMfaCode('');
      showToast({
        title: 'Two-Factor Authentication Enabled',
        description: 'Multi-factor authentication is now protecting your account.',
        type: 'success'
      });
    } catch (err) {
      showToast({
        title: 'Verification Failed',
        description: 'Invalid authentication code.',
        type: 'error'
      });
    } finally {
      setIsEnablingMfa(false);
    }
  };

  // 6. Privacy Save
  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrivacy(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privacyHideProfile: !showProfileToLoggedUsers
        })
      });
      if (!res.ok) {
        throw new Error('Failed to update privacy settings');
      }
      showToast({
        title: 'Privacy Settings Saved',
        description: 'Your visibility preferences have been updated.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err.message,
        type: 'error'
      });
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  // 7. Notification Preferences Save
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotifications(true);
    try {
      const res = await fetch('/api/auth/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailPromotions,
          emailCourseUpdates: emailAnnouncements,
          emailSecurityAlerts
        })
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      showToast({
        title: 'Preferences Updated',
        description: 'Your email subscription preferences have been saved.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err.message,
        type: 'error'
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // 8. Add Payment Method
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethodType === 'card') {
      const last4 = cardNumber.slice(-4) || '8888';
      setSavedCards([...savedCards, { id: Date.now().toString(), brand: 'Mastercard', last4, exp: cardExpiry || '08/29', default: false }]);
    }
    setIsAddPaymentModalOpen(false);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setUpiId('');
    showToast({
      title: 'Payment Method Added',
      description: 'Your new billing method has been securely stored.',
      type: 'success'
    });
  };

  // 9. Close Account
  const handleConfirmCloseAccount = async () => {
    if (!closePassword) {
      showToast({
        title: 'Password Required',
        description: 'Please enter your password to confirm account closure.',
        type: 'error'
      });
      return;
    }
    setIsClosingAccount(true);
    try {
      // Sign out and redirect
      await new Promise((r) => setTimeout(r, 800));
      await logout();
      router.push('/login?msg=' + encodeURIComponent('Your account has been closed.'));
    } catch (err: any) {
      showToast({
        title: 'Action Failed',
        description: err.message || 'Could not close account.',
        type: 'error'
      });
    } finally {
      setIsClosingAccount(false);
      setIsCloseAccountModalOpen(false);
    }
  };

  // Navigation Links items list matching user prompt exactly
  const navTabs: { id: SettingsTab; label: string; href: string }[] = [
    { id: 'profile', label: 'Profile', href: '/user/edit-profile/' },
    { id: 'photo', label: 'Photo', href: '/user/edit-photo/' },
    { id: 'account-security', label: 'Account Security', href: '/user/edit-account/' },
    { id: 'subscriptions', label: 'Subscriptions', href: '/user/manage-subscriptions/' },
    { id: 'payment-methods', label: 'Payment methods', href: '/user/edit-payment-methods/' },
    { id: 'privacy', label: 'Privacy', href: '/user/edit-privacy/' },
    { id: 'notifications', label: 'Notification Preferences', href: '/user/edit-notification-preferences/' },
    { id: 'api-clients', label: 'API clients', href: '/user/edit-api-clients/' },
    { id: 'close-account', label: 'Close account', href: '/user/close-account/' }
  ];

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* ================================================================= */}
        {/* LEFT SIDEBAR (Udemy Profile Navigation)                           */}
        {/* ================================================================= */}
        <aside className="md:col-span-4 lg:col-span-3">
          <div className="flex flex-col items-center text-center pb-6">
            {/* User Avatar Circle */}
            <div className="w-28 h-28 rounded-full bg-[#1c1d1f] text-white text-3xl font-bold flex items-center justify-center shadow-sm tracking-wider overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {/* Name */}
            <h2 className="mt-3 text-base font-bold text-[#1c1d1f] tracking-tight">
              {fullName}
            </h2>

            {/* View public profile link */}
            <button
              type="button"
              onClick={() => setIsPublicProfileModalOpen(true)}
              className="text-xs font-bold text-[#5022c3] hover:text-[#37178c] hover:underline mt-1 cursor-pointer"
            >
              View public profile
            </button>
          </div>

          {/* Vertical Menu Tabs */}
          <nav className="border-t border-[#d1d7dc] pt-3 flex flex-col space-y-0.5">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id, tab.href)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer rounded-[2px] flex items-center justify-between ${
                    isActive
                      ? 'bg-[#f7f9fa] text-[#1c1d1f] font-bold border-l-4 border-[#1c1d1f]'
                      : 'text-[#2d2f31] hover:bg-[#f7f9fa] hover:text-[#1c1d1f] font-normal'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5022c3]" />
                  )}
                </button>
              );
            })}

            {/* Quick Logout Button */}
            <div className="pt-2 mt-2 border-t border-[#d1d7dc]">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer rounded-[2px] flex items-center justify-between"
              >
                <span>Log out</span>
                <Icon name="logout" size={16} className="text-red-600" />
              </button>
            </div>
          </nav>
        </aside>

        {/* ================================================================= */}
        {/* RIGHT CONTENT PANEL                                               */}
        {/* ================================================================= */}
        <main className="md:col-span-8 lg:col-span-9 border border-[#d1d7dc] rounded-[4px] p-6 sm:p-10 bg-white shadow-xs min-h-[560px]">
          {/* --------------------------------------------------------------- */}
          {/* 1. ACCOUNT SECURITY VIEW (Target View for "Account Settings")   */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'account-security' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  Account
                </h1>
                <p className="text-sm text-[#6a6f73] mt-1">
                  Edit your account settings and change your password here.
                </p>
              </div>

              {/* Email Section */}
              <div className="pb-8 border-b border-[#d1d7dc] mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#1c1d1f]">Email:</h2>
                    <p className="text-sm text-[#2d2f31] mt-1">
                      Your email address is{' '}
                      <span className="font-semibold text-[#1c1d1f]">
                        {currentUser?.email || 'student@example.com'}
                      </span>
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                    <Icon name="verified" size={16} />
                    <span>Verified</span>
                  </div>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="pb-8 border-b border-[#d1d7dc] mb-8">
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[2px] flex items-center gap-2">
                      <Icon name="error_outline" size={16} />
                      <span>{passwordError}</span>
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-[2px] flex items-center gap-2">
                      <Icon name="check_circle" size={16} />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      Current password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      New password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="h-11 px-6 bg-[#2d2f31] hover:bg-black text-white font-bold text-xs rounded-[2px] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Updating password...</span>
                        </>
                      ) : (
                        <span>Change password</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Phone Number Section */}
              <div className="pb-8 border-b border-[#d1d7dc] mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#1c1d1f]">Phone Number:</h2>
                    <p className="text-sm text-[#6a6f73] mt-1">
                      {phone ? (
                        <span className="font-semibold text-[#1c1d1f]">{phone}</span>
                      ) : (
                        'You have not set a phone number'
                      )}
                    </p>
                  </div>
                  <div>
                    {!isEditingPhone ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(true)}
                        className="h-10 px-4 border border-[#2d2f31] text-xs font-bold text-[#2d2f31] hover:bg-[#f7f9fa] rounded-[2px] transition-colors cursor-pointer"
                      >
                        {phone ? 'Edit phone' : 'Add phone number'}
                      </button>
                    ) : null}
                  </div>
                </div>

                {isEditingPhone && (
                  <form onSubmit={handleSavePhone} className="mt-4 max-w-md space-y-3">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-10 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSavingPhone}
                        className="h-9 px-4 bg-[#2d2f31] hover:bg-black text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                      >
                        {isSavingPhone ? 'Saving...' : 'Save phone'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(false)}
                        className="h-9 px-4 border border-[#d1d7dc] text-xs text-[#2d2f31] hover:bg-[#f7f9fa] rounded-[2px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Multi-factor Authentication Section */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <h2 className="text-sm font-bold text-[#1c1d1f]">
                      Multi-factor Authentication
                    </h2>
                    <p className="text-sm text-[#6a6f73] mt-2 leading-relaxed">
                      Increase your account security by requiring that a code emailed to you be entered when you log in. For more information on how multi-factor authentication works, refer to our{' '}
                      <a href="#help" className="text-[#5022c3] font-bold hover:underline">
                        Help Center article
                      </a>
                      .
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (mfaEnabled) {
                          setMfaEnabled(false);
                          showToast({
                            title: 'MFA Disabled',
                            description: 'Two-factor authentication has been turned off.',
                            type: 'info'
                          });
                        } else {
                          setIsMfaModalOpen(true);
                        }
                      }}
                      className={`h-10 px-5 text-xs font-bold rounded-[2px] transition-colors cursor-pointer ${
                        mfaEnabled
                          ? 'border border-red-300 text-red-600 hover:bg-red-50'
                          : 'bg-[#5022c3] hover:bg-[#37178c] text-white shadow-xs'
                      }`}
                    >
                      {mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                    </button>
                  </div>
                </div>

                {/* MFA Status Indicator */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      mfaEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-[#6a6f73]">
                    Status:{' '}
                    <strong className="text-[#1c1d1f]">
                      {mfaEnabled ? 'Enabled & Active' : 'Not configured'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 2. PROFILE VIEW (/user/edit-profile/)                            */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'profile' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  Public profile
                </h1>
                <p className="text-sm text-[#6a6f73] mt-1">
                  Add information about yourself
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Instructor at T.E.A.C.H or Early Childhood Specialist"
                    className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                  />
                  <p className="text-[11px] text-[#6a6f73] mt-1">
                    Add a professional headline like &quot;Montessori Teacher&quot; or &quot;ECE Educator&quot;.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Biography
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                  />
                  <p className="text-[11px] text-[#6a6f73] mt-1">
                    Links and coupon codes are not permitted in your biography.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px] bg-white"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Spanish">Español</option>
                    <option value="French">Français</option>
                  </select>
                </div>

                {/* Social Links */}
                <div className="pt-4 border-t border-[#d1d7dc] space-y-4">
                  <h3 className="text-sm font-bold text-[#1c1d1f]">Links</h3>

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      Twitter / X
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-[#2d2f31] bg-[#f7f9fa] text-xs text-[#6a6f73]">
                        https://x.com/
                      </span>
                      <input
                        type="text"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="username"
                        className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-r-[2px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      LinkedIn
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-[#2d2f31] bg-[#f7f9fa] text-xs text-[#6a6f73]">
                        https://linkedin.com/in/
                      </span>
                      <input
                        type="text"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="username"
                        className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-r-[2px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      YouTube
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-[#2d2f31] bg-[#f7f9fa] text-xs text-[#6a6f73]">
                        https://youtube.com/@
                      </span>
                      <input
                        type="text"
                        value={youtube}
                        onChange={(e) => setYoutube(e.target.value)}
                        placeholder="channel"
                        className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-r-[2px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#d1d7dc]">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="h-11 px-8 bg-[#2d2f31] hover:bg-black text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 3. PHOTO VIEW (/user/edit-photo/)                                */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'photo' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  Photo
                </h1>
                <p className="text-sm text-[#6a6f73] mt-1">
                  Add a nice photo of yourself for your profile.
                </p>
              </div>

              <div className="space-y-8 max-w-xl">
                <div>
                  <h3 className="text-xs font-bold text-[#1c1d1f] mb-3">
                    Image preview
                  </h3>
                  <div className="w-48 h-48 border-2 border-dashed border-[#d1d7dc] rounded-[4px] bg-[#f7f9fa] flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Icon name="person" size={48} className="mx-auto text-gray-400 mb-2" />
                        <span className="text-xs text-[#6a6f73]">No image set</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#1c1d1f] mb-2">
                    Add / Change Image
                  </h3>
                  <label className="inline-flex items-center gap-2 h-11 px-6 border border-[#2d2f31] text-xs font-bold text-[#2d2f31] hover:bg-[#f7f9fa] rounded-[2px] cursor-pointer transition-colors">
                    <Icon name="cloud_upload" size={18} />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload image'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/gif"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-[#6a6f73] mt-2">
                    Minimum 200 x 200 pixels. JPG, PNG, or GIF format.
                  </p>
                </div>

                {avatarUrl && (
                  <div className="pt-4 border-t border-[#d1d7dc]">
                    <button
                      type="button"
                      onClick={async () => {
                        setAvatarUrl('');
                        await fetch('/api/auth/profile', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ avatar: '' })
                        });
                        await refreshUser();
                        showToast({
                          title: 'Photo Removed',
                          description: 'Default avatar will be shown.',
                          type: 'info'
                        });
                      }}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Remove photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 4. SUBSCRIPTIONS VIEW (/user/manage-subscriptions/)              */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'subscriptions' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  Subscriptions
                </h1>
                <p className="text-sm text-[#6a6f73] mt-1">
                  Manage your T.E.A.C.H Personal Plan or course subscriptions.
                </p>
              </div>

              <div className="border border-[#d1d7dc] rounded-[4px] p-6 bg-[#f7f9fa] mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-[#5022c3] flex items-center justify-center shrink-0">
                    <Icon name="card_membership" size={24} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1c1d1f]">
                      T.E.A.C.H Personal Plan
                    </h2>
                    <p className="text-xs text-[#6a6f73] mt-1 leading-relaxed">
                      You do not currently have an active subscription. Subscribe to unlock access to 10,000+ top-rated courses in pedagogy, early childhood education, and technology.
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 h-10 px-5 bg-[#5022c3] hover:bg-[#37178c] text-white text-xs font-bold rounded-[2px] transition-colors"
                      >
                        <span>Explore Personal Plan</span>
                        <Icon name="arrow_forward" size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#6a6f73]">
                Need help with your billing or subscription invoices? View your{' '}
                <Link href="/student/learning?tab=payments" className="text-[#5022c3] font-bold hover:underline">
                  Purchase history
                </Link>
                .
              </p>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 5. PAYMENT METHODS VIEW (/user/edit-payment-methods/)            */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'payment-methods' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                    Payment methods
                  </h1>
                  <p className="text-sm text-[#6a6f73] mt-1">
                    Manage your payment methods and billing preferences.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(true)}
                  className="h-10 px-4 bg-[#2d2f31] hover:bg-black text-white text-xs font-bold rounded-[2px] transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                >
                  <Icon name="add" size={16} />
                  <span>Add payment method</span>
                </button>
              </div>

              <div className="space-y-4">
                {savedCards.map((card) => (
                  <div
                    key={card.id}
                    className="border border-[#d1d7dc] rounded-[4px] p-5 flex items-center justify-between hover:bg-[#f7f9fa] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-[#1c1d1f] text-white font-bold text-xs rounded flex items-center justify-center tracking-wider">
                        {card.brand.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1c1d1f]">
                          {card.brand} ending in {card.last4}
                        </p>
                        <p className="text-xs text-[#6a6f73]">Expires {card.exp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {card.default && (
                        <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                          Default
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSavedCards(savedCards.filter((c) => c.id !== card.id));
                          showToast({
                            title: 'Method Removed',
                            description: 'Card was deleted from your account.',
                            type: 'info'
                          });
                        }}
                        className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Security Banner */}
              <div className="mt-8 p-4 bg-[#f7f9fa] border border-[#d1d7dc] rounded-[4px] flex items-center gap-3 text-xs text-[#6a6f73]">
                <Icon name="lock" size={20} className="text-[#2d2f31] shrink-0" />
                <p>
                  All payment transactions are encrypted with industry-standard 256-bit SSL encryption. We comply with RBI Guidelines and tokenization mandates.
                </p>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 6. PRIVACY VIEW (/user/edit-privacy/)                            */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'privacy' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  Privacy
                </h1>
                <p className="text-sm text-[#6a6f73] mt-1">
                  Modify your privacy settings here.
                </p>
              </div>

              <form onSubmit={handleSavePrivacy} className="space-y-6 max-w-xl">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showProfileToLoggedUsers}
                    onChange={(e) => setShowProfileToLoggedUsers(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#5022c3] rounded border-gray-300 focus:ring-[#5022c3]"
                  />
                  <div>
                    <span className="text-sm font-bold text-[#1c1d1f]">
                      Show your profile to logged in users
                    </span>
                    <p className="text-xs text-[#6a6f73] mt-0.5">
                      Allow other enrolled learners and instructors to view your biography and accomplishments.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCoursesOnProfile}
                    onChange={(e) => setShowCoursesOnProfile(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#5022c3] rounded border-gray-300 focus:ring-[#5022c3]"
                  />
                  <div>
                    <span className="text-sm font-bold text-[#1c1d1f]">
                      Show courses you&apos;re taking on your profile page
                    </span>
                    <p className="text-xs text-[#6a6f73] mt-0.5">
                      Display your current learning journey on your public student profile.
                    </p>
                  </div>
                </label>

                <div className="pt-4 border-t border-[#d1d7dc]">
                  <button
                    type="submit"
                    disabled={isSavingPrivacy}
                    className="h-11 px-8 bg-[#2d2f31] hover:bg-black text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    {isSavingPrivacy ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 7. NOTIFICATION PREFERENCES VIEW                                */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'notifications' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  Notification Preferences
                </h1>
                <p className="text-sm text-[#6a6f73] mt-1">
                  Turn promotional emails, announcements, and digests on or off.
                </p>
              </div>

              <form onSubmit={handleSaveNotifications} className="space-y-6 max-w-xl">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emailPromotions}
                    onChange={(e) => setEmailPromotions(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#5022c3] rounded border-gray-300 focus:ring-[#5022c3]"
                  />
                  <div>
                    <span className="text-sm font-bold text-[#1c1d1f]">
                      Promotions, course recommendations, and helpful resources from T.E.A.C.H.
                    </span>
                    <p className="text-xs text-[#6a6f73] mt-0.5">
                      Receive discounts, flash sale updates, and trending courses tailored to your interests.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emailAnnouncements}
                    onChange={(e) => setEmailAnnouncements(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#5022c3] rounded border-gray-300 focus:ring-[#5022c3]"
                  />
                  <div>
                    <span className="text-sm font-bold text-[#1c1d1f]">
                      Announcements from instructors whose courses you&apos;re enrolled in.
                    </span>
                    <p className="text-xs text-[#6a6f73] mt-0.5">
                      Get updates about new lessons, assignments, and educational resources directly from your instructors.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emailWeeklyDigest}
                    onChange={(e) => setEmailWeeklyDigest(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#5022c3] rounded border-gray-300 focus:ring-[#5022c3]"
                  />
                  <div>
                    <span className="text-sm font-bold text-[#1c1d1f]">
                      Weekly learning digest and progress summary.
                    </span>
                    <p className="text-xs text-[#6a6f73] mt-0.5">
                      A personalized weekly report detailing time spent studying, completed lessons, and recommendations.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emailSecurityAlerts}
                    onChange={(e) => setEmailSecurityAlerts(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#5022c3] rounded border-gray-300 focus:ring-[#5022c3]"
                  />
                  <div>
                    <span className="text-sm font-bold text-[#1c1d1f]">
                      Security and critical account notices.
                    </span>
                    <p className="text-xs text-[#6a6f73] mt-0.5">
                      Immediate alerts for logins from new devices, password changes, or billing receipts.
                    </p>
                  </div>
                </label>

                <div className="pt-4 border-t border-[#d1d7dc]">
                  <button
                    type="submit"
                    disabled={isSavingNotifications}
                    className="h-11 px-8 bg-[#2d2f31] hover:bg-black text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    {isSavingNotifications ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 8. API CLIENTS VIEW (/user/edit-api-clients/)                    */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'api-clients' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  API clients
                </h1>
                <p className="text-sm text-[#6a6f73] mt-1">
                  Create and manage API credentials for custom LMS integrations.
                </p>
              </div>

              <div className="border border-[#d1d7dc] rounded-[4px] p-6 bg-[#f7f9fa] max-w-xl">
                <Icon name="code" size={32} className="text-[#2d2f31] mb-2" />
                <h3 className="text-sm font-bold text-[#1c1d1f]">
                  No active API clients
                </h3>
                <p className="text-xs text-[#6a6f73] mt-1 leading-relaxed">
                  You have not created any API clients yet. Use API credentials to connect your external learning apps, automate certificate distribution, or integrate webhooks.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      showToast({
                        title: 'API Request Submitted',
                        description: 'Your developer application is under review. Credentials will appear once approved.',
                        type: 'info'
                      });
                    }}
                    className="h-10 px-5 bg-[#2d2f31] hover:bg-black text-white text-xs font-bold rounded-[2px] transition-colors cursor-pointer"
                  >
                    Request API Access
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 9. CLOSE ACCOUNT VIEW (/user/close-account/)                     */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'close-account' && (
            <div>
              <div className="pb-6 border-b border-[#d1d7dc] mb-8">
                <h1 className="text-2xl font-bold text-[#1c1d1f] tracking-tight">
                  Close account
                </h1>
                <p className="text-sm text-red-600 font-bold mt-1">
                  Warning: If you close your account, you will be unsubscribed from all your courses, and will lose access forever.
                </p>
              </div>

              <div className="space-y-6 max-w-xl">
                <div className="p-4 bg-red-50 border border-red-200 rounded-[2px] text-xs text-red-800 leading-relaxed">
                  <p className="font-bold mb-1">Please note the following:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    <li>Your active course enrollments and certificates will be permanently erased.</li>
                    <li>Any pending refunds or wallet credits will be forfeited.</li>
                    <li>This action is irreversible and cannot be undone.</li>
                  </ul>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setIsCloseAccountModalOpen(true)}
                    className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    Close Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* MODAL: MFA SETUP / VERIFICATION CODE                                */}
      {/* =================================================================== */}
      {isMfaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] max-w-md w-full p-6 shadow-2xl border border-[#d1d7dc] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#d1d7dc]">
              <h3 className="text-base font-bold text-[#1c1d1f]">
                Enable Multi-factor Authentication
              </h3>
              <button
                type="button"
                onClick={() => setIsMfaModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-[#6a6f73] leading-relaxed">
                A 6-digit verification code has been dispatched to{' '}
                <strong className="text-[#1c1d1f]">
                  {currentUser?.email || 'your registered email'}
                </strong>
                . Enter the code below to finalize multi-factor authentication.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="e.g. 583921"
                  className="w-full h-11 px-3 border border-[#2d2f31] text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#d1d7dc] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsMfaModalOpen(false)}
                className="h-10 px-4 text-xs font-bold text-[#2d2f31] hover:bg-[#f7f9fa] rounded-[2px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMfa}
                disabled={isEnablingMfa || mfaCode.length < 4}
                className="h-10 px-5 bg-[#5022c3] hover:bg-[#37178c] text-white text-xs font-bold rounded-[2px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isEnablingMfa ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD PAYMENT METHOD                                           */}
      {/* =================================================================== */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] max-w-md w-full p-6 shadow-2xl border border-[#d1d7dc] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#d1d7dc]">
              <h3 className="text-base font-bold text-[#1c1d1f]">
                Add payment method
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPaymentModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex border-b border-[#d1d7dc] my-4">
              <button
                type="button"
                onClick={() => setPaymentMethodType('card')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 cursor-pointer ${
                  paymentMethodType === 'card'
                    ? 'border-[#1c1d1f] text-[#1c1d1f]'
                    : 'border-transparent text-[#6a6f73]'
                }`}
              >
                Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodType('upi')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 cursor-pointer ${
                  paymentMethodType === 'upi'
                    ? 'border-[#1c1d1f] text-[#1c1d1f]'
                    : 'border-transparent text-[#6a6f73]'
                }`}
              >
                UPI ID (VPA)
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              {paymentMethodType === 'card' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full h-10 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full h-10 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full h-10 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. Full Name on Card"
                      className="w-full h-10 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@okhdfcbank"
                    className="w-full h-10 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                  />
                  <p className="text-[11px] text-[#6a6f73] mt-1">
                    A collect request will be sent to your UPI app for verification.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-[#d1d7dc] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="h-10 px-4 text-xs font-bold text-[#2d2f31] hover:bg-[#f7f9fa] rounded-[2px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 bg-[#2d2f31] hover:bg-black text-white text-xs font-bold rounded-[2px] transition-colors cursor-pointer"
                >
                  Save payment method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CLOSE ACCOUNT CONFIRMATION                                   */}
      {/* =================================================================== */}
      {isCloseAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] max-w-md w-full p-6 shadow-2xl border border-[#d1d7dc] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#d1d7dc]">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <Icon name="warning" size={20} />
                <span>Close your account</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCloseAccountModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-[#2d2f31] leading-relaxed">
                Are you sure you want to close your account? All your enrolled courses, certificates, and learning activity will be irreversibly erased.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={closePassword}
                  onChange={(e) => setClosePassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full h-10 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-red-500 rounded-[2px]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#d1d7dc] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCloseAccountModalOpen(false)}
                className="h-10 px-4 text-xs font-bold text-[#2d2f31] hover:bg-[#f7f9fa] rounded-[2px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseAccount}
                disabled={isClosingAccount || !closePassword}
                className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-[2px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isClosingAccount ? 'Closing account...' : 'Yes, close my account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: VIEW PUBLIC PROFILE                                          */}
      {/* =================================================================== */}
      {isPublicProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[4px] max-w-2xl w-full p-8 shadow-2xl border border-[#d1d7dc] my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#d1d7dc]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6a6f73]">
                Public Profile Preview
              </span>
              <button
                type="button"
                onClick={() => setIsPublicProfileModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="py-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-[#1c1d1f] text-white text-2xl font-bold flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#1c1d1f]">{fullName}</h2>
                  <p className="text-sm font-medium text-[#6a6f73] mt-0.5">{headline}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-[#5022c3]">
                    {website && (
                      <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline font-semibold">
                        <Icon name="language" size={16} />
                        <span>Website</span>
                      </a>
                    )}
                    {twitter && (
                      <span className="flex items-center gap-1 font-semibold">
                        <Icon name="public" size={16} />
                        <span>@{twitter}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#d1d7dc] pt-5">
                <h3 className="text-sm font-bold text-[#1c1d1f] mb-2">About me</h3>
                <p className="text-sm text-[#2d2f31] leading-relaxed whitespace-pre-line">
                  {bio}
                </p>
              </div>

              <div className="border-t border-[#d1d7dc] pt-5">
                <h3 className="text-sm font-bold text-[#1c1d1f] mb-2">Enrolled Courses</h3>
                <div className="p-4 bg-[#f7f9fa] rounded-[2px] border border-[#d1d7dc] text-xs text-[#6a6f73]">
                  Courses you are enrolled in appear here on your public profile if enabled in your Privacy settings.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#d1d7dc] flex justify-end">
              <button
                type="button"
                onClick={() => setIsPublicProfileModalOpen(false)}
                className="h-10 px-6 bg-[#2d2f31] hover:bg-black text-white text-xs font-bold rounded-[2px] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
