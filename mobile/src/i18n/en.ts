import type { ar } from "./ar";

/** English texts (same keys as ar.ts). */
export const en: typeof ar = {
  brand: "Wsool",
  common: {
    back: "Back", retry: "Try again", loading: "Loading…", error: "Something went wrong. Please try again.", offline: "No internet connection.",
    soon: "Coming soon to the app", openOnWeb: "Open on the website",
  },
  login: {
    title: "Sign in", subtitle: "We'll email you a sign-in code.", email: "Email", sendCode: "Send code", sending: "Sending…",
    codeSent: "We sent a sign-in code to", code: "Sign-in code", verify: "Sign in", verifying: "Checking…", changeEmail: "Change email",
    apple: "Continue with Apple", google: "Continue with Google", or: "or with email",
    agree: "By continuing, you agree to the Terms of Use and Privacy Policy.", terms: "Terms of Use", privacy: "Privacy Policy",
    errors: {
      invalid_email: "Enter a valid email.", invalid_code: "The code is wrong or has expired.",
      rate_limited: "Too many attempts. Wait a little and try again.", failed: "Something went wrong. Please try again.", provider_failed: "We couldn't sign you in. Try again or use your email.",
    },
  },
  onboarding: {
    title: "Choose your page name", subtitle: "This is the link you'll share with brands.", label: "Username",
    rules: "3 to 20: lowercase English letters, numbers, dot or _", checking: "Checking…", available: "✓ Available",
    submit: "Claim name", saving: "Claiming…",
    errors: {
      length: "It must be 3 to 20 characters.", characters: "Use English letters, numbers, dot and _ only.",
      dots: "No dot at the start or end, and no two dots in a row.", reserved: "This name is reserved.", extension: "It can't end with a file extension like .png",
      taken: "This name is taken, try another.", failed: "Something went wrong. Please try again.",
    },
  },
  tabs: { home: "Home", page: "My page", stats: "Analytics", notifications: "Notifications", more: "More" },
  home: {
    hello: "Hi {name}", yourLink: "Your page link", published: "Published", hidden: "Hidden", share: "Share link", copy: "Copy", copied: "Copied",
    view: "View page", last30: "Last 30 days", vsPrev: "vs previous month", noCompare: "Nothing to compare yet",
    stat: { views: "Page visits", whatsapp: "WhatsApp taps", email: "Email taps", country: "Top country" },
    statsPro: "Page analytics are available on the paid plan.", visits: "Page visits", previous: "Previous period",
    completion: "Page completion", complete: "Your page is complete. Great!", stepsDone: "{done} of {total}",
    todo: {
      photo: "Add your photo", bio: "Write a short bio", accounts: "Add your accounts and numbers", tags: "Add content tags",
      brands: "Add logos of brands you worked with", work: "Add videos of your past work", rates: "Set your ad rates",
      contact: "Add a way to contact you", audience: "Add your audience data", verify: "Verify your accounts",
    },
    verification: "Account verification", verifiedOf: "{done} of {total} verified", noAccounts: "Add your accounts to verify them.",
    vstatus: { none: "Not verified", verified: "Verified", expiring: "Expiring soon", in_review: "In review", rejected: "Rejected", expired: "Expired" },
    numbersStale: "Update your numbers for this month",
  },
  plan: {
    pro: "Pro", trial: "Free trial", free: "Free", trialLeft: "{days} days left in your trial",
    renews: "Renews on {date}", ends: "Ends on {date}", manageOnWeb: "Manage your plan on wsool.link",
  },
  notifications: { title: "Notifications", empty: "No notifications yet.", markAll: "Mark all as read" },
  more: {
    title: "More", sections: "Your page", account: "Account", settings: "Settings", language: "Language", theme: "Appearance",
    themeSystem: "Device setting", themeLight: "Light", themeDark: "Dark", signOut: "Sign out", support: "Contact support",
    signedInAs: "Signed in as {email}", version: "Version {v}",
  },
  section: {
    edit: "Edit page", accounts: "Accounts & numbers", work: "Brands & work", rates: "Ad rates", links: "Links & services",
    contact: "Contact", verification: "Verification", appearance: "Appearance", analytics: "Analytics", referrals: "Commission", subscription: "Subscription",
  },

  editor: {
    save: "Save", saving: "Saving…", saved: "Saved", failed: "Not saved. Check your entries and try again.",
    uploading: "Uploading…", moveUp: "Move up", moveDown: "Move down", remove: "Remove", close: "Close",
  },
  contact: {
    subtitle: "How brands reach you from your page", show: "Show on my page", whatsapp: "WhatsApp number", whatsappHint: "With the country code, e.g. +966 5X XXX XXXX",
    whatsappError: "Invalid number. Include the country code.", emailTitle: "Email", email: "Contact email", emailError: "Enter a valid email.",
    taps: "{n} taps this month", test: "Test the link",
  },
  appearance: {
    subtitle: "How visitors see your page", template: "Template", templatesPro: "Locked templates are available on Pro.",
    templates: { white: "White", black: "Black", sand: "Sand", pink: "Pink", black_gold: "Black & Gold", vivid: "Vivid", green: "Green", custom: "Custom" },
    customColors: "Your colours", color1: "Main colour", color2: "Second colour (optional)", hexError: "Use the #RRGGBB format",
    modeLight: "Light", modeDark: "Dark", accent: "Accent colour", accentDefault: "Template colour", auto: "Auto",
    icons: "Account icons style", iconSolid: "Solid circle", iconColor: "Brand colours", iconOutline: "Outline",
    hideBranding: "Hide “Made with Wsool”", hideBrandingPro: "Available on Pro", proOnly: "This option is available on Pro.",
  },
  links: {
    subtitle: "Your store and course links, and services beyond ads", links: "My links", services: "My services",
    title: "Link title", titleEn: "Title in English", url: "Link", image: "Link image", addLink: "Add link",
    serviceName: "Service name", serviceNameEn: "Service name in English", description: "Short description", descriptionEn: "Description in English",
    price: "Price ({currency})", onRequest: "On request", unit: "Unit", unitHint: "e.g. per hour", unitEn: "Unit in English",
    addService: "Add service", badUrl: "Link {n} isn't valid.", freeLimit: "The Free plan shows your first {links} links and {services} services.",
  },
  rates: {
    subtitle: "Set your rates and choose whether to show them", proOnly: "Rates show on your page with Pro. You can prepare them now.",
    showOnPage: "Show rates on my page", showOnPageHint: "Hidden shows “Rates on request”", showInPdf: "Show them in the PDF", vatIncluded: "Prices include VAT",
    currency: "Currency", currencies: { SAR: "SAR", USD: "USD", AED: "AED", KWD: "KWD" },
    type: "Ad type", typeEn: "Type in English", price: "Price ({currency})", addRate: "Add rate", suggestions: "Video|Story|Post|Live|Mention|Event attendance",
    noAccounts: "Add your accounts first in “Accounts & numbers”.", bundle: "Bundle", bundleHint: "Two or more platforms for one price",
    bundleName: "Bundle name", bundlePlatforms: "Platforms in the bundle", bundleIncomplete: "A bundle needs at least two platforms and one rate.",
  },
  accounts: {
    subtitle: "Update your numbers at the start of each month", accounts: "My accounts", platform: "Platform", handle: "Username", followers: "Followers", members: "Members",
    link: "Profile link", add: "Add account", resetHint: "Changing the username or followers of a verified account removes its verification.", saveAccounts: "Save accounts",
    views: "Monthly views", viewsHint: "Total views shown on your page", viewsLabel: "{platform} views", saveViews: "Save views",
    audience: "Audience data", audiencePro: "Audience data shows on your page with Pro.", fromShot: "Fill from a stats screenshot", reading: "Reading the screenshot…",
    gender: "Gender", female: "Female", male: "Male", ages: "Ages", countries: "Top countries (5)", cities: "Top cities", city: "City", saveAudience: "Save audience",
    status: {
      saving: "Saving…", saved: "Saved", failed: "Not saved. Check your entries.", over: "A group adds up to more than 100%.",
      reading: "Reading the screenshot…", filled: "Filled from the screenshot. Check it and save.", uncertain: "Filled, but check the ages before saving.",
      limit: "You reached today's limit for reading screenshots.", not_stats: "This screenshot has no clear audience stats.",
    },
  },
  work: {
    subtitle: "Brand logos and videos of your work", brands: "Brands you worked with", brandsHint: "Shown as a scrolling strip on your page", brandName: "Brand name",
    addBrand: "Add logo", saveBrands: "Save logos", works: "Past work", freeLimit: "The Free plan shows your first {n} works.",
    video: "Video", link: "Post link", pickVideo: "Choose video", replaceVideo: "Replace video", postLink: "Post link (TikTok / Instagram / YouTube)",
    checkLink: "Check link", cover: "Cover image", brand: "Brand", type: "Type of work", typeHint: "e.g. Ad, coverage", addWork: "Add work",
    badLink: "The link must be a TikTok, Instagram or YouTube post.", missingFile: "A work has no video or link.",
  },
  edit: {
    subtitle: "Changes show on your page once saved", publishTitle: "Page status", published: "Your page is published", hidden: "Your page is hidden",
    publishHint: "Only you can see a hidden page", needsName: "Add your name first, then publish.",
    username: "Username", usernameHint: "You can change it once every 30 days", changeUsername: "Change name", cooldown: "You can change it after {date}",
    photo: "Photo", changePhoto: "Change photo", removePhoto: "Remove photo", shape: "Photo shape", shapeFull: "Full", shapeCircle: "Circle",
    logo: "Your logo", logoHint: "Shown at the top of your PDF", addLogo: "Add logo", changeLogo: "Change logo", removeLogo: "Remove logo",
    about: "About you", primaryLang: "Page main language", enEnabled: "Add an English version", secondLangHint: "Visitors see your page in their device language",
    fields: { fullName: "Name", specialty: "Specialty", bio: "Bio", city: "City", country: "Country" },
    required: "Required", invalid: "Invalid", checkFields: "Check the highlighted fields.",
    categories: "Content category", categoriesHint: "Pick one or two (not shown on your page)",
    tags: "Tags", tagsHint: "Short words about your content (up to 12)", addTag: "Add tag", tagHint: "Type the tag and press done",
    licenses: "Licenses", licensesHint: "e.g. Mawthooq license, shown on your page when added", licenseName: "License name", licenseNameHint: "e.g. Mawthooq license",
    licenseNameEn: "Name in English", licenseNumber: "License number", addFile: "Attach file (optional)", replaceFile: "Replace file", addLicense: "Add license",
  },
};
