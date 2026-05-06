const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "live.com",
  "msn.com"
]);

function normalizeTargetType(targetType) {
  if (targetType === "person" || targetType === "business" || targetType === "organization") {
    return targetType;
  }
  return "business";
}

function contactsAllowedFor(targetType) {
  return targetType === "business" || targetType === "organization";
}

function getPrivacyNotice(targetType) {
  if (contactsAllowedFor(targetType)) {
    return "Yalnızca kamuya açık kaynaklarda görünen işletme/kurum iletişim bilgileri listelenir.";
  }

  return "Şahıs aramalarında özel telefon, kişisel e-posta ve ev adresi çıkarılmaz; yalnızca kamuya açık profesyonel/sosyal profil bağlantıları ve kaynaklı özet gösterilir.";
}

function isPersonalEmail(email) {
  const domain = String(email).split("@").pop()?.toLowerCase();
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

function redactUnsafeContacts(text, targetType) {
  if (contactsAllowedFor(targetType)) {
    return text;
  }

  return String(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[kisisel e-posta gizlendi]")
    .replace(/(?:\+?\d[\s().-]?){8,}\d/g, "[telefon gizlendi]");
}

module.exports = {
  contactsAllowedFor,
  getPrivacyNotice,
  isPersonalEmail,
  normalizeTargetType,
  redactUnsafeContacts
};
