// Wraps Stripe calls for per-seat subscription billing. Every function is a
// safe no-op if STRIPE_SECRET_KEY isn't set, so the rest of the app (company
// creation, employee management) works fine before you've connected Stripe.
const isConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
const stripe = isConfigured ? require("stripe")(process.env.STRIPE_SECRET_KEY) : null;

let cachedProductId = null;

// All companies share one Stripe Product ("Eazi HR Seat"); each company gets
// its own Price (since pricePerSeatCents can differ per company) and Subscription.
async function getOrCreateProduct() {
  if (!isConfigured) return null;
  if (cachedProductId) return cachedProductId;

  if (process.env.STRIPE_PRODUCT_ID) {
    cachedProductId = process.env.STRIPE_PRODUCT_ID;
    return cachedProductId;
  }

  const products = await stripe.products.list({ limit: 1, active: true });
  const existing = products.data.find((p) => p.name === "Eazi HR Seat");
  if (existing) {
    cachedProductId = existing.id;
    return cachedProductId;
  }

  const product = await stripe.products.create({ name: "Eazi HR Seat" });
  cachedProductId = product.id;
  return cachedProductId;
}

// Creates a Stripe customer + a metered-quantity subscription for a new company.
// initialSeats is usually 1 (the first admin account created alongside the company).
async function createCompanySubscription({ companyId, companyName, contactEmail, pricePerSeatCents, initialSeats = 1 }) {
  if (!isConfigured) return { stripeCustomerId: null, stripeSubscriptionId: null };

  const customer = await stripe.customers.create({
    name: companyName,
    email: contactEmail,
    metadata: { companyId },
  });

  const productId = await getOrCreateProduct();
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: pricePerSeatCents,
    currency: "usd",
    recurring: { interval: "month" },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id, quantity: initialSeats }],
    metadata: { companyId },
  });

  return { stripeCustomerId: customer.id, stripeSubscriptionId: subscription.id };
}

// Call this any time a company's active employee count changes (new hire,
// termination) to keep Stripe's billed quantity in sync.
async function updateSeatCount(stripeSubscriptionId, newSeatCount) {
  if (!isConfigured || !stripeSubscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return;

  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: itemId, quantity: newSeatCount }],
  });
}

async function cancelSubscription(stripeSubscriptionId) {
  if (!isConfigured || !stripeSubscriptionId) return;
  await stripe.subscriptions.cancel(stripeSubscriptionId);
}

function constructWebhookEvent(rawBody, signature) {
  if (!isConfigured) return null;
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = {
  isConfigured,
  createCompanySubscription,
  updateSeatCount,
  cancelSubscription,
  constructWebhookEvent,
};
