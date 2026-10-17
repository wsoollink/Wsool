/** Arabic texts (primary). Same wording as the website (messages/ar.json) where the screens match. */
export const ar = {
  brand: "وصول",
  common: {
    retry: "حاول مرة ثانية", loading: "جاري التحميل…", error: "صار خطأ. جرّب مرة ثانية.", offline: "ما فيه اتصال بالإنترنت.",
    soon: "قريباً في التطبيق", openOnWeb: "افتحه في الموقع",
  },
  login: {
    title: "سجّل دخولك", subtitle: "بنرسل لك رمز دخول على إيميلك.", email: "الإيميل", sendCode: "أرسل الرمز", sending: "جاري الإرسال…",
    codeSent: "أرسلنا رمز الدخول إلى", code: "رمز الدخول", verify: "دخول", verifying: "جاري التحقق…", changeEmail: "تغيير الإيميل",
    apple: "المتابعة مع Apple", google: "المتابعة مع Google", or: "أو بالإيميل",
    agree: "بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية.", terms: "شروط الاستخدام", privacy: "سياسة الخصوصية",
    errors: {
      invalid_email: "اكتب إيميل صحيح.", invalid_code: "الرمز غير صحيح أو انتهت صلاحيته.",
      rate_limited: "محاولات كثيرة. انتظر شوي وجرّب مرة ثانية.", failed: "صار خطأ. جرّب مرة ثانية.", provider_failed: "ما قدرنا ندخلك. جرّب مرة ثانية أو ادخل بالإيميل.",
    },
  },
  onboarding: {
    title: "اختر اسم صفحتك", subtitle: "هذا رابطك اللي بتشاركه مع البراندات.", label: "اسم المستخدم",
    rules: "من 3 إلى 20: حروف إنجليزية صغيرة، أرقام، نقطة أو _", checking: "جاري التحقق…", available: "✓ الاسم متاح",
    submit: "احجز الاسم", saving: "جاري الحجز…",
    errors: {
      length: "لازم يكون من 3 إلى 20 حرف.", characters: "استخدم حروف إنجليزية وأرقام ونقطة و _ بس.",
      dots: "ما يبدأ أو ينتهي بنقطة، ولا فيه نقطتين ورا بعض.", reserved: "هذا الاسم محجوز.", extension: "ما يصلح ينتهي بامتداد ملف مثل .png",
      taken: "الاسم مأخوذ، جرّب غيره.", failed: "صار خطأ. جرّب مرة ثانية.",
    },
  },
  tabs: { home: "الرئيسية", page: "صفحتي", stats: "الإحصائيات", notifications: "التنبيهات", more: "المزيد" },
  home: {
    hello: "أهلًا {name}", yourLink: "رابط صفحتك", published: "منشورة", hidden: "مخفية", share: "شارك الرابط", copy: "انسخ", copied: "تم النسخ",
    view: "عرض الصفحة", last30: "آخر 30 يوم", vsPrev: "عن الشهر السابق", noCompare: "ما فيه بيانات للمقارنة",
    stat: { views: "زيارات الصفحة", whatsapp: "ضغطات WhatsApp", email: "ضغطات الإيميل", country: "أكثر دولة" },
    statsPro: "إحصائيات صفحتك متاحة في الخطة المدفوعة.", visits: "زيارات الصفحة", previous: "الفترة السابقة",
    completion: "اكتمال صفحتك", complete: "صفحتك مكتملة، ممتاز!", stepsDone: "{done} من {total}",
    todo: {
      photo: "أضف صورتك", bio: "اكتب نبذة عنك", accounts: "أضف حساباتك وأرقامك", tags: "أضف تصنيفات لمحتواك",
      brands: "أضف شعارات الشركات اللي تعاملت معها", work: "أضف فيديوهات أعمالك السابقة", rates: "حدد أسعار إعلاناتك",
      contact: "أضف طريقة تواصل", audience: "أضف بيانات جمهورك", verify: "وثّق حساباتك",
    },
    verification: "توثيق الحسابات", verifiedOf: "{done} من {total} موثّقة", noAccounts: "أضف حساباتك عشان توثقها.",
    vstatus: { none: "غير موثّق", verified: "موثّق", expiring: "ينتهي قريب", in_review: "قيد المراجعة", rejected: "مرفوض", expired: "منتهي" },
    numbersStale: "حدّث أرقامك لهذا الشهر",
  },
  plan: {
    pro: "الاحترافية", trial: "تجربة مجانية", free: "مجانية", trialLeft: "باقي {days} يوم على التجربة",
    renews: "يتجدد في {date}", ends: "ينتهي في {date}", manageOnWeb: "إدارة الاشتراك من الموقع wsool.link",
  },
  notifications: { title: "التنبيهات", empty: "ما عندك تنبيهات للحين.", markAll: "تحديد الكل كمقروء" },
  more: {
    title: "المزيد", sections: "أقسام صفحتك", account: "الحساب", settings: "الإعدادات", language: "اللغة", theme: "المظهر",
    themeSystem: "حسب الجهاز", themeLight: "فاتح", themeDark: "داكن", signOut: "تسجيل الخروج", support: "تواصل مع الدعم",
    signedInAs: "مسجّل باسم {email}", version: "الإصدار {v}",
  },
  section: {
    edit: "تعديل الصفحة", accounts: "الحسابات والأرقام", work: "الشركات والأعمال", rates: "أسعار الإعلانات", links: "روابطي وخدماتي",
    contact: "التواصل", verification: "التوثيق", appearance: "المظهر", analytics: "الإحصائيات", referrals: "العمولة", subscription: "الاشتراك",
  },
};
