const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ── Create a Stripe Customer for an organization ────────────────
const createCustomer = async (orgName, email) => {
  return stripe.customers.create({
    name: orgName,
    email,
    metadata: { platform: "raven-ace" },
  });
};

// ── Create a Checkout Session for subscribing to a plan ─────────
const createCheckoutSession = async (customerId, priceId, orgId) => {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/organization/subscription?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${process.env.FRONTEND_URL}/organization/subscription?canceled=true`,
    metadata: { orgId: orgId.toString() },
    subscription_data: {
      metadata: { orgId: orgId.toString() },
    },
  });
};

// ── Create a Billing Portal session ─────────────────────────────
const createPortalSession = async (customerId) => {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/organization/subscription`,
  });
};

// ── Cancel a subscription at period end ─────────────────────────
const cancelSubscription = async (subscriptionId) => {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
};

// ── Reactivate a subscription that was set to cancel ────────────
const reactivateSubscription = async (subscriptionId) => {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
};

// ── Update subscription to a different plan ─────────────────────
const updateSubscription = async (subscriptionId, newPriceId) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });
};

// ── Construct Stripe webhook event ──────────────────────────────
const constructWebhookEvent = (rawBody, sig) => {
  return stripe.webhooks.constructEvent(
    rawBody,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

// ── Retrieve a Checkout Session ─────────────────────────────────
const retrieveCheckoutSession = async (sessionId) => {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
};

module.exports = {
  createCustomer,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  updateSubscription,
  constructWebhookEvent,
  retrieveCheckoutSession,
};
