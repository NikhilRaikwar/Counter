export const OFFER_PRESETS: Record<
  string,
  { productName: string; description: string; listPrice: number; rules: string }
> = {
  Consulting: {
    productName: "Strategy Consulting Session",
    description:
      "1-on-1 intensive 90-minute roadmap advisory session with actionable written architecture summary.",
    listPrice: 15000,
    rules:
      "Never sell below ₹12,000.\nCounter may discount up to ₹3,000.\nCan include 2 weeks of email follow-up before lowering price.\nMaximum 4 rounds.\nNever offer ongoing retainer hours without approval.",
  },
  "Agency project": {
    productName: "High-Converting Landing Page Design",
    description:
      "Custom responsive landing page designed and built in React with conversion copywriting and analytics setup.",
    listPrice: 45000,
    rules:
      "Never sell below ₹38,000.\nMax discount is ₹7,000.\nCan offer free post-launch support for 14 days.\nMaximum 4 negotiation rounds.\nNever add extra pages or backend features without custom quote.",
  },
  Course: {
    productName: "Fullstack AI Mastery Cohort",
    description:
      "6-week live cohort covering LLM orchestration, evals, fine-tuning, and production system architecture.",
    listPrice: 18000,
    rules:
      "Never sell below ₹14,500.\nCounter may discount by up to ₹3,500.\nCan bundle community access archive before offering bottom price.\nMaximum 3 rounds.\nNever grant 1-on-1 mentorship for free.",
  },
  "SaaS annual plan": {
    productName: "Counter Pro Annual Plan",
    description:
      "12 months of unlimited negotiable links, autonomous deal desk engine, and custom webhooks.",
    listPrice: 24000,
    rules:
      "Never sell below ₹19,000.\nCounter may discount up to ₹5,000 on annual upfront deals.\nOffer 2 bonus team seats before reducing price further.\nMax 4 negotiation rounds.",
  },
  "Event package": {
    productName: "VIP Conference Pass + Masterclass",
    description:
      "Full access to the 2-day conference, private speaker dinner, and hands-on workshop pass.",
    listPrice: 12000,
    rules:
      "Never sell below ₹9,500.\nMax discount ₹2,500.\nOffer workshop recording bundle first.\nMaximum 3 rounds.\nNever offer complimentary hotel stay.",
  },
};
