/**
 * i18n.ts — English / Hindi translation system
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
  reportNewIssue: { en: "Report a New Civic Issue", hi: "नई नागरिक समस्या रिपोर्ट करें" },
  issueDetails: { en: "Issue Details", hi: "समस्या का विवरण" },
  photos: { en: "Photos", hi: "फ़ोटो" },
  location: { en: "Location", hi: "स्थान" },
  title: { en: "Title", hi: "शीर्षक" },
  titlePlaceholder: { en: "Brief description of the issue", hi: "समस्या का संक्षिप्त विवरण" },
  description: { en: "Description", hi: "विवरण" },
  descriptionPlaceholder: { en: "Describe the problem in detail (min. 20 characters).", hi: "समस्या को विस्तार से बताएं (कम से कम 20 अक्षर)।" },
  urgency: { en: "Urgency", hi: "तात्कालिकता" },
  category: { en: "Category", hi: "श्रेणी" },
  selectCategory: { en: "Select a category", hi: "श्रेणी चुनें" },
  selectUrgency: { en: "Select urgency", hi: "तात्कालिकता चुनें" },
  state: { en: "State / UT", hi: "राज्य / केंद्र शासित प्रदेश" },
  city: { en: "City", hi: "शहर" },
  selectState: { en: "Select state / UT", hi: "राज्य / केंद्र शासित प्रदेश चुनें" },
  selectCity: { en: "Select city", hi: "शहर चुनें" },
  selectStateFirst: { en: "Select state first", hi: "पहले राज्य चुनें" },
  pincode: { en: "Pincode", hi: "पिन कोड" },
  pincodePlaceholder: { en: "6-digit Indian pincode (optional)", hi: "6 अंकों का भारतीय पिन कोड (वैकल्पिक)" },
  pincodeInvalid: { en: "Please enter a valid 6-digit Indian pincode.", hi: "कृपया मान्य 6 अंकों का भारतीय पिन कोड दर्ज करें।" },
  landmark: { en: "Address / Landmark", hi: "पता / लैंडमार्क" },
  landmarkPlaceholder: { en: "Street address, intersection, or landmark", hi: "सड़क का पता, चौराहा, या लैंडमार्क" },
  submitReport: { en: "Submit Report", hi: "रिपोर्ट सबमिट करें" },
  congratulations: { en: "Congratulations!", hi: "बधाई हो!" },
  reportSubmitted: { en: "Report Submitted Successfully!", hi: "रिपोर्ट सफलतापूर्वक सबमिट की गई!" },
  thankYou: {
    en: "Thank you for helping improve your community!",
    hi: "आपके समुदाय को बेहतर बनाने में मदद के लिए धन्यवाद!",
  },
  goHome: { en: "Go Home", hi: "होम पर जाएं" },
  viewInFeed: { en: "View in Feed", hi: "फ़ीड में देखें" },
  pinExactLocation: { en: "Pin Exact Location", hi: "सटीक स्थान पिन करें" },
  useGPS: { en: "Use GPS", hi: "GPS उपयोग करें" },
  locating: { en: "Locating…", hi: "स्थान खोज रहे हैं…" },
  addPhoto: { en: "Add Photo", hi: "फ़ोटो जोड़ें" },
  analyzingImage: { en: "Analyzing image with AI...", hi: "AI से छवि विश्लेषण हो रहा है..." },

  // Feed
  communityFeed: { en: "Community Feed", hi: "सामुदायिक फ़ीड" },
  newIssue: { en: "+ New Issue", hi: "+ नई समस्या" },
  noIssues: { en: "No issues match your filters.", hi: "कोई समस्या फ़िल्टर से मेल नहीं खाती।" },
  allCategories: { en: "All Categories", hi: "सभी श्रेणियां" },
  allStatus: { en: "All Status", hi: "सभी स्थिति" },
  allUrgency: { en: "All Urgency", hi: "सभी तात्कालिकता" },
  searchPlaceholder: { en: "Search issues…", hi: "समस्याएं खोजें…" },
  sortNewest: { en: "Newest", hi: "नवीनतम" },
  sortUpvoted: { en: "Most Upvoted", hi: "सबसे अधिक अपवोट" },
  sortCritical: { en: "Critical First", hi: "गंभीर पहले" },
  sortRating: { en: "Top Rated", hi: "सर्वोच्च रेटिंग" },
  allTime: { en: "All Time", hi: "हर समय" },
  today: { en: "Today", hi: "आज" },
  thisWeek: { en: "This Week", hi: "इस सप्ताह" },
  thisMonth: { en: "This Month", hi: "इस महीने" },

  // Dashboard
  welcomeBack: { en: "Welcome back", hi: "वापस स्वागत है" },
  myReports: { en: "My Reports", hi: "मेरी रिपोर्ट्स" },
  recentActivity: { en: "Recent Activity", hi: "हाल की गतिविधि" },
  noReportsYet: { en: "You haven't submitted any reports yet.", hi: "आपने अभी तक कोई रिपोर्ट सबमिट नहीं की।" },
  reportFirstIssue: { en: "Report your first issue", hi: "अपनी पहली समस्या रिपोर्ट करें" },
  yourStats: { en: "Your Stats", hi: "आपके आँकड़े" },
  points: { en: "points", hi: "अंक" },
  level: { en: "Level", hi: "स्तर" },
  resolved: { en: "Resolved", hi: "हल किया गया" },
  reports: { en: "Reports", hi: "रिपोर्ट्स" },

  // Notifications
  notificationsTitle: { en: "Notifications", hi: "सूचनाएं" },
  markAllRead: { en: "Mark all read", hi: "सभी पढ़ा हुआ चिह्नित करें" },
  noNotifications: { en: "No notifications yet.", hi: "अभी तक कोई सूचना नहीं।" },

  // Leaderboard
  leaderboardTitle: { en: "Community Leaderboard", hi: "सामुदायिक लीडरबोर्ड" },
  rank: { en: "Rank", hi: "रैंक" },
  user: { en: "User", hi: "उपयोगकर्ता" },
  totalPoints: { en: "Total Points", hi: "कुल अंक" },

  // Settings
  profileSettings: { en: "Profile & Settings", hi: "प्रोफ़ाइल और सेटिंग्स" },
  profile: { en: "Profile", hi: "प्रोफ़ाइल" },
  displayName: { en: "Display name", hi: "प्रदर्शन नाम" },
  bio: { en: "Bio", hi: "परिचय" },
  bioPlaceholder: { en: "A short bio about yourself", hi: "अपने बारे में एक संक्षिप्त परिचय" },
  namePlaceholder: { en: "Your name", hi: "आपका नाम" },
  cityPlaceholder: { en: "Your city", hi: "आपका शहर" },
  saveChanges: { en: "Save Changes", hi: "परिवर्तन सहेजें" },
  profileSaved: { en: "Profile saved!", hi: "प्रोफ़ाइल सहेजी गई!" },
  notificationPrefs: { en: "Notification preferences", hi: "सूचना प्राथमिकताएं" },
  emailNotifications: { en: "Email notifications", hi: "ईमेल सूचनाएं" },
  pushNotifications: { en: "Push notifications", hi: "पुश सूचनाएं" },
  myActivity: { en: "My reports", hi: "मेरी रिपोर्ट्स" },
  noReportsSettings: { en: "You haven't submitted any reports yet.", hi: "आपने अभी तक कोई रिपोर्ट सबमिट नहीं की।" },

  // Auth
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

  // Map
  mapTitle: { en: "Issues Map", hi: "समस्याएं का नक्शा" },
  mapNoIssues: { en: "No issues with location data yet.", hi: "अभी तक स्थान डेटा वाली कोई समस्या नहीं।" },

  // Issue detail
  backToFeed: { en: "Back to Feed", hi: "फ़ीड पर वापस" },
  commentPlaceholder: { en: "Add a comment…", hi: "टिप्पणी जोड़ें…" },
  postComment: { en: "Post", hi: "पोस्ट करें" },
  noComments: { en: "No comments yet. Be the first!", hi: "अभी तक कोई टिप्पणी नहीं। पहले बनें!" },
  issueNotFound: { en: "Issue not found.", hi: "समस्या नहीं मिली।" },
  flagSpam: { en: "Flag as spam", hi: "स्पैम के रूप में चिह्नित करें" },
  similarIssue: { en: "Similar issue already reported", hi: "समान समस्या पहले ही रिपोर्ट की जा चुकी है" },
  viewExisting: { en: "View Existing", hi: "मौजूदा देखें" },
  upvoteExisting: { en: "Upvote Existing", hi: "मौजूदा को अपवोट करें" },
  submitAnyway: { en: "Submit Anyway", hi: "फिर भी सबमिट करें" },

  // Authority / Analytics
  authorityPanel: { en: "Authority Panel", hi: "अधिकारी पैनल" },
  analyticsTitle: { en: "Analytics", hi: "विश्लेषण" },
  totalReports: { en: "Total Reports", hi: "कुल रिपोर्ट्स" },
  pendingReports: { en: "Pending", hi: "लंबित" },
  inProgressReports: { en: "In Progress", hi: "प्रगति में" },
  resolvedReports: { en: "Resolved", hi: "हल किया गया" },

  // General
  language: { en: "Language", hi: "भाषा" },
  admin: { en: "Admin", hi: "एडमिन" },
  loading: { en: "Loading…", hi: "लोड हो रहा है…" },
  close: { en: "Close", hi: "बंद करें" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  save: { en: "Save", hi: "सहेजें" },
  submit: { en: "Submit", hi: "सबमिट करें" },
  logOutConfirm: { en: "Are you sure you want to log out of IssueSnap?", hi: "क्या आप IssueSnap से लॉग आउट करना चाहते हैं?" },
  logOutTitle: { en: "Log out?", hi: "लॉग आउट करें?" },
} as const;

export type TKey = keyof typeof translations;

export function translate(key: TKey, lang: Lang): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

// Re-export useT from the .tsx file so existing imports of useT from i18n still work
export { useT } from "./i18n.hook";
