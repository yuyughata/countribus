import {
  bookingCancelledEmail,
  bookingCancelledSms,
  bookingConfirmationEmail,
  bookingConfirmationSms,
  departureReminderEmail,
  departureReminderSms,
  payoutSentEmail,
  referralRewardEmail,
  vendorApprovedEmail,
  vendorNewBookingEmail,
  vendorRejectedEmail,
  welcomeEmail,
  type EmailMessage,
} from "@/lib/notifications/templates";

export type TemplatePreview = {
  key: string;
  name: string;
  category: "Customer" | "Operator";
  channels: ("email" | "sms" | "whatsapp")[];
  description: string;
  trigger: string;
  email?: EmailMessage;
  sms?: string;
};

const soon = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

const booking = {
  contactName: "Ada Okafor",
  reference: "CB-7K2M9QX1",
  vendorName: "Chisco Express",
  originCity: "Lagos",
  destinationCity: "Abuja",
  departureAt: soon,
  passengerCount: 2,
  grandTotalKobo: 3_000_000,
  ticketUrl: "https://countribus.app/bookings/CB-7K2M9QX1",
};
const boardingAddress = "Jibowu Terminal, Yaba, Lagos";

/** All notification templates with a sample render, for the admin Templates tab. */
export const TEMPLATE_CATALOG: TemplatePreview[] = [
  {
    key: "booking_confirmation",
    name: "Booking confirmation",
    category: "Customer",
    channels: ["email", "sms", "whatsapp"],
    description: "Ticket, route, departure and total after a payment is verified.",
    trigger: "Payment verified (webhook)",
    email: bookingConfirmationEmail(booking),
    sms: bookingConfirmationSms({ ...booking, boardingAddress, contactPhone: "+234 803 000 0001" }),
  },
  {
    key: "departure_reminder",
    name: "Departure reminder",
    category: "Customer",
    channels: ["email", "sms"],
    description: "A nudge before the trip with the boarding address.",
    trigger: "Scheduled before departure",
    email: departureReminderEmail({ ...booking, boardingAddress }),
    sms: departureReminderSms({ ...booking, boardingAddress }),
  },
  {
    key: "booking_cancelled",
    name: "Booking cancelled / refunded",
    category: "Customer",
    channels: ["email", "sms"],
    description: "Confirms a cancellation and any refund.",
    trigger: "Booking cancelled or refunded",
    email: bookingCancelledEmail({
      contactName: booking.contactName,
      reference: booking.reference,
      originCity: booking.originCity,
      destinationCity: booking.destinationCity,
      refundKobo: 3_000_000,
    }),
    sms: bookingCancelledSms({ reference: booking.reference, refundKobo: 3_000_000 }),
  },
  {
    key: "welcome",
    name: "Welcome",
    category: "Customer",
    channels: ["email"],
    description: "Greets a newly registered customer.",
    trigger: "New customer signup",
    email: welcomeEmail({ name: "Ada", searchUrl: "https://countribus.app/search" }),
  },
  {
    key: "referral_reward",
    name: "Referral reward earned",
    category: "Customer",
    channels: ["email"],
    description: "Tells a referrer they've earned a discount.",
    trigger: "Referred friend's first paid booking",
    email: referralRewardEmail({
      name: "Ada",
      percent: 15,
      searchUrl: "https://countribus.app/search",
    }),
  },
  {
    key: "vendor_new_booking",
    name: "New booking alert",
    category: "Operator",
    channels: ["email"],
    description: "Notifies the operator of a new paid booking and their net.",
    trigger: "Payment verified (webhook)",
    email: vendorNewBookingEmail({
      vendorName: "Chisco Express",
      reference: booking.reference,
      originCity: booking.originCity,
      destinationCity: booking.destinationCity,
      departureAt: soon,
      passengerCount: 2,
      netKobo: 2_700_000,
      dashboardUrl: "https://countribus.app/dashboard",
    }),
  },
  {
    key: "vendor_approved",
    name: "Operator approved",
    category: "Operator",
    channels: ["email"],
    description: "Welcomes an approved operator with next steps.",
    trigger: "Admin approves application",
    email: vendorApprovedEmail({
      vendorName: "Chisco Express",
      dashboardUrl: "https://countribus.app/dashboard",
    }),
  },
  {
    key: "vendor_rejected",
    name: "Operator declined",
    category: "Operator",
    channels: ["email"],
    description: "Informs an applicant their application was declined.",
    trigger: "Admin declines application",
    email: vendorRejectedEmail({ vendorName: "Chisco Express", reason: "Incomplete documents" }),
  },
  {
    key: "payout_sent",
    name: "Payout sent",
    category: "Operator",
    channels: ["email"],
    description: "Confirms a settlement transfer to the operator's bank.",
    trigger: "Payout processed",
    email: payoutSentEmail({
      vendorName: "Chisco Express",
      amountKobo: 2_700_000,
      bookingCount: 3,
      bankName: "GTBank",
      last4: "6789",
      dashboardUrl: "https://countribus.app/dashboard/finance",
    }),
  },
];
