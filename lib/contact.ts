/**
 * How to reach the shop. One place, because it was seven.
 *
 * The phone number, the Instagram handle and the mail address were pasted into
 * the footer, the contact page, the floating button, two modals and the help
 * bot — as placeholders, and every one of them had to be found again to change
 * a digit. A customer who taps a dead number does not tap twice, so these live
 * here and everything reads them.
 */
export const CONTACT = {
  /** E.164, for links. */
  phone: "+972509300990",
  /** How an Israeli reads it back. */
  phoneDisplay: "050-930-0990",
  whatsapp: "https://wa.me/972509300990",
  instagram: "https://www.instagram.com/unit3design/",
  instagramHandle: "@unit3design",
  email: "unit3designow@gmail.com",
} as const;

/** A mailto with the subject and body already written. */
export function mailto(subject: string, body = ""): string {
  const q = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  return `mailto:${CONTACT.email}?${q.toString()}`;
}

/**
 * A phone number as it is typed.
 *
 * The field used to accept anything and then let the browser refuse the whole
 * form with a bubble the customer cannot act on ("הזנת מספר תקין חובה" over a
 * field they filled). Letters simply cannot be typed now, and what is left is
 * checked for length before the order goes anywhere.
 */
export const cleanPhone = (v: string): string => v.replace(/[^\d+\-() ]/g, "").slice(0, 20);

/** Israeli numbers are 9 or 10 digits; an international one may be longer. */
export const phoneLooksReal = (v: string): boolean => {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};
