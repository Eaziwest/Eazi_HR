const prisma = require("../config/db");
const stripeBilling = require("../utils/stripe");

// Handles the Stripe events that matter for keeping a company's access in sync
// with their actual payment status. Configure this URL (yourdomain/api/billing/webhook)
// in the Stripe dashboard once STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set.
module.exports = async function stripeWebhookHandler(req, res) {
  if (!stripeBilling.isConfigured) {
    return res.status(503).json({ message: "Billing is not configured on this server" });
  }

  let event;
  try {
    event = stripeBilling.constructWebhookEvent(req.body, req.headers["stripe-signature"]);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const subscription = event.data.object;
  const companyId = subscription.metadata?.companyId;

  switch (event.type) {
    case "invoice.payment_failed":
      if (companyId) {
        await prisma.company.update({ where: { id: companyId }, data: { billingStatus: "PAST_DUE" } });
      }
      break;

    case "invoice.payment_succeeded":
      if (companyId) {
        await prisma.company.update({ where: { id: companyId }, data: { billingStatus: "ACTIVE" } });
      }
      break;

    case "customer.subscription.deleted":
      if (companyId) {
        await prisma.company.update({ where: { id: companyId }, data: { billingStatus: "CANCELED" } });
      }
      break;

    default:
      break; // ignore events we don't act on
  }

  res.json({ received: true });
};
