/**
 * The questions about paying, on the pricing page and the help page. Plain
 * strings: the pricing page also puts them in its FAQ structured data.
 * `refundDays` null (the backend could not say) leaves the refund answer out
 * rather than guess at the policy.
 */
export function billingQuestions(trialDays: number, refundDays: number | null): { q: string; a: string; id?: string }[] {
  const all = [
    {
      q: "How does the free trial work?",
      a: `Every new account gets ${trialDays} days of everything, free. There is no card to enter and nothing to cancel: when the trial ends, you choose whether to pay.`,
    },
    {
      q: "Does it renew automatically?",
      a: "No. You pay for a month or a year at a time, and nothing is charged again without you. We email you before your time runs out.",
    },
    {
      q: "How do I pay?",
      a: "In Kenya, by M-Pesa or card. Everywhere else, by debit or credit card. Payments are handled by Paystack, so your card details never reach us.",
    },
    {
      id: "refunds",
      q: "Can I get a refund?",
      a: `Yes. If it isn't for you, ask within ${refundDays} days of your first payment and we refund it in full. A refund can take up to 10 working days to reach your card or M-Pesa.`,
    },
    {
      q: "Why this price?",
      a: "Prices are set by country, and this page shows the price for the country you are browsing from. The price you pay is confirmed when you subscribe, and after your first payment it follows the country of the card or M-Pesa account you paid with.",
    },
    {
      q: "What happens when my time runs out?",
      a: "Everything you added stays saved: your players, games, prep and books. Your account, settings and the public pages stay open. Pay again and it is all back the moment the payment goes through.",
    },
    {
      q: "Can I pay before my time runs out?",
      a: "Yes. Paying early adds the new month or year on after the time you already have, so nothing is lost.",
    },
  ];
  return refundDays === null ? all.filter((x) => x.id !== "refunds") : all;
}
