/**
 * i18n.ts — English / Hindi translation system
 *
 * HOW TO ADD MORE STRINGS:
 *   Add a key to the `translations` object with both `en` and `hi` values.
 *   Use the `useT()` hook anywhere in a component to get the translator.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t("reportIssue")}</h1>
 */

export type Lang = "en" | "hi";

export const LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
];

const translations = {
  // Nav / shell
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  reportIssue: { en: "Report Issue", hi: "समस्या रिपोर्ट करें" },
  issueFeed: { en: "Issue Feed", hi: "समस्या फ़ीड" },
  map: { en: "Map", hi: "नक्शा" },
  notifications: { en: "Notifications", hi: "सूचनाएं" },
  leaderboard: { en: "Leaderboard", hi: "लीडरबोर्ड" },
  analytics: { en: "Analytics", hi: "विश्लेषण" },
  authority: { en: "Authority", hi: "अधिकारी" },
  settings: { en: "Settings", hi: "सेटिंग्स" },
  signIn: { en: "Sign In", hi: "साइन इन" },
  signUp: { en: "Create Account", hi: "खाता बनाएं" },
  logOut: { en: "Log out", hi: "लॉग आउट" },

  // Home page
  heroTitle: {
    en: "Report Local Issues.\nTrack Progress.\nImprove Communities.",
    hi: "स्थानीय समस्याएं रिपोर्ट करें।\nप्रगति ट्रैक करें।\nसमुदाय सुधारें।",
  },
  heroSubtitle: {
    en: "The modern platform connecting citizens and authorities to resolve civic challenges efficiently.",
    hi: "नागरिकों और अधिकारियों को जोड़ने वाला आधुनिक मंच।",
  },
  reportAnIssue: { en: "Report an Issue", hi: "समस्या रिपोर्ट करें" },
  goToDashboard: { en: "Go to Dashboard", hi: "डैशबोर्ड पर जाएं" },
  howItWorks: { en: "How it Works", hi: "यह कैसे काम करता है" },
  exploreIssues: { en: "Explore Issues", hi: "समस्याएं देखें" },
  issuesResolved: { en: "Issues Resolved", hi: "हल की गई समस्याएं" },
  activeReporters: { en: "Active Reporters", hi: "सक्रिय रिपोर्टर" },
  avgResponseTime: { en: "Avg Response Time", hi: "औसत प्रतिक्रिया समय" },
  snapSubmit: { en: "Snap & Submit", hi: "फ़ोटो लें और सबमिट करें" },
  snapSubmitDesc: {
    en: "Capture the issue and add details.",
    hi: "समस्या की फ़ोटो लें और विवरण जोड़ें।",
  },
  trackProgress: { en: "Track Progress", hi: "प्रगति ट्रैक करें" },
  trackProgressDesc: {
    en: "Follow the status with real-time updates.",
    hi: "रियल-टाइम अपडेट के साथ स्थिति देखें।",
  },
  resolveImprove: { en: "Resolve & Improve", hi: "हल करें और सुधारें" },
  resolveImproveDesc: {
    en: "Collaborate with local services for solutions.",
    hi: "समाधान के लिए स्थानीय सेवाओं के साथ काम करें।",
  },

  // Report page
  issueDetails: { en: "Issue Details", hi: "समस्या का विवरण" },
  photos: { en: "Photos", hi: "फ़ोटो" },
  location: { en: "Location", hi: "स्थान" },
  title: { en: "Title", hi: "शीर्षक" },
  description: { en: "Description", hi: "विवरण" },
  urgency: { en: "Urgency", hi: "तात्कालिकता" },
  category: { en: "Category", hi: "श्रेणी" },
  state: { en: "State / UT", hi: "राज्य / केंद्र शासित प्रदेश" },
  city: { en: "City", hi: "शहर" },
  pincode: { en: "Pincode", hi: "पिन कोड" },
  landmark: { en: "Landmark / Address", hi: "लैंडमार्क / पता" },
  submitReport: { en: "Submit Report", hi: "रिपोर्ट सबमिट करें" },
  congratulations: { en: "Congratulations!", hi: "बधाई हो!" },
  reportSubmitted: { en: "Report Submitted Successfully!", hi: "रिपोर्ट सफलतापूर्वक सबमिट की गई!" },
  thankYou: {
    en: "Thank you for helping improve your community!",
    hi: "आपके समुदाय को बेहतर बनाने में मदद के लिए धन्यवाद!",
  },
  goHome: { en: "Go Home", hi: "होम पर जाएं" },
  viewInFeed: { en: "View in Feed", hi: "फ़ीड में देखें" },

  // Feed
  newIssue: { en: "+ New Issue", hi: "+ नई समस्या" },
  noIssues: { en: "No issues match your filters.", hi: "कोई समस्या फ़िल्टर से मेल नहीं खाती।" },
  allCategories: { en: "All Categories", hi: "सभी श्रेणियां" },
  allStatus: { en: "All Status", hi: "सभी स्थिति" },
  allUrgency: { en: "All Urgency", hi: "सभी तात्कालिकता" },

  // Auth
  welcomeBack: { en: "Welcome back", hi: "वापस स्वागत है" },
  createAccount: { en: "Create your account", hi: "अपना खाता बनाएं" },
  emailOtpSent: { en: "OTP sent to your email!", hi: "OTP आपके ईमेल पर भेजा गया!" },
  enterOtp: { en: "Enter OTP", hi: "OTP दर्ज करें" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें" },
  resendOtp: { en: "Resend OTP", hi: "OTP दोबारा भेजें" },
  otpExpires: { en: "OTP expires in", hi: "OTP समाप्त होगा" },
  forgotPassword: { en: "Forgot password?", hi: "पासवर्ड भूल गए?" },
  resetPassword: { en: "Reset Password", hi: "पासवर्ड रीसेट करें" },
  newPassword: { en: "New Password", hi: "नया पासवर्ड" },
  confirmPassword: { en: "Confirm Password", hi: "पासवर्ड की पुष्टि करें" },

  // General
  language: { en: "Language", hi: "भाषा" },
  admin: { en: "Admin", hi: "एडमिन" },
  points: { en: "points", hi: "अंक" },
  loading: { en: "Loading…", hi: "लोड हो रहा है…" },
  close: { en: "Close", hi: "बंद करें" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  save: { en: "Save", hi: "सहेजें" },
  submit: { en: "Submit", hi: "सबमिट करें" },
} as const;

export type TKey = keyof typeof translations;

export function translate(key: TKey, lang: Lang): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

// Re-export useT from the .tsx file so existing imports of useT from i18n still work
export { useT } from "./i18n.hook";
