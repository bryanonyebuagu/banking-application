export const notificationOptions = [
  { type: "incoming_transfers", label: "Incoming transfers", description: "Deposits and transfers received." },
  { type: "outgoing_transfers", label: "Outgoing transfers", description: "Transfers, withdrawals and payments sent." },
  { type: "account_activity", label: "Account activity", description: "Important changes to your accounts and cards." },
  { type: "security_alerts", label: "Security alerts", description: "High-priority protection notices.", mandatoryEmail: true },
  { type: "login_notifications", label: "Login notifications", description: "New sign-ins and access changes.", mandatoryEmail: true },
  { type: "banking_updates", label: "Important banking updates", description: "Required service and account notices." },
] as const;

export type NotificationOptionType = typeof notificationOptions[number]["type"];
