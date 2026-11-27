export function mapsUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return '';
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
}

export function buildSosText({ userName, mapsUrl: link, isTest }) {
  const who = userName ? ` from ${userName}` : '';
  const lead = isTest
    ? `UCASA TEST SOS${who}. This is not a real crash.`
    : `UCASA SOS${who}. Possible crash. I need help.`;
  return link ? `${lead} Location: ${link}` : lead;
}

export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  if (withCountry.length < 7 || withCountry.length > 15) return null;
  return `+${withCountry}`;
}

function smsBodyJoiner() {
  if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
    return '&body=';
  }
  return '?body=';
}

export function smsHref(phones, body) {
  const nums = (phones || [])
    .map((phone) => String(phone || '').replace(/[^\d+]/g, ''))
    .filter(Boolean)
    .join(',');
  if (!nums) return '';
  return `sms:${nums}${smsBodyJoiner()}${encodeURIComponent(body || '')}`;
}

export function whatsappHref(phone, body) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(body || '')}`;
}

export function openSms(phones, body) {
  const href = smsHref(phones, body);
  if (!href) return false;
  window.location.href = href;
  return true;
}

export function openWhatsApp(phone, body) {
  const href = whatsappHref(phone, body);
  if (!href) return false;
  window.open(href, '_blank', 'noopener,noreferrer');
  return true;
}

export function callEmergencyNumber() {
  window.location.href = 'tel:112';
}

export function canShareSos() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareSos(body) {
  if (!canShareSos()) return false;
  await navigator.share({ text: body });
  return true;
}
