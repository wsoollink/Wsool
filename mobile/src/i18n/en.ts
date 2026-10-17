import type { ar } from "./ar";

/** English texts (same keys as ar.ts). */
export const en: typeof ar = {
  brand: "Wsool",
  common: {
    retry: "Try again", loading: "Loading…", error: "Something went wrong. Please try again.", offline: "No internet connection.",
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
};
