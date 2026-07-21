const stripeService = require("../services/stripeService");
const Organization = require("../models/Organization");
const { AppError } = require("../utils/errorUtils");

// @desc    Create a Stripe Checkout Session
// @route   POST /api/stripe/create-checkout
// @access  Organization only
const createCheckout = async (req, res, next) => {
  try {
    const { plan } = req.body; // 'standard' or 'premium'
    if (!["standard", "premium"].includes(plan)) {
      return next(new AppError("Invalid plan selected.", 400));
    }

    const org = req.organization;
    const priceId =
      plan === "standard"
        ? process.env.STRIPE_STANDARD_PRICE_ID
        : process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!priceId) {
      return next(new AppError("Stripe configuration is missing.", 500));
    }

    // Create Stripe Customer if not exists
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(org.name, org.email);
      customerId = customer.id;
      org.stripeCustomerId = customerId;
      await org.save();
    }

    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      org._id
    );

    res.status(200).json({
      status: "success",
      data: { url: session.url },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a Stripe Billing Portal Session
// @route   POST /api/stripe/billing-portal
// @access  Organization only
const getBillingPortal = async (req, res, next) => {
  try {
    const org = req.organization;
    if (!org.stripeCustomerId) {
      return next(new AppError("No billing history found.", 404));
    }

    const session = await stripeService.createPortalSession(org.stripeCustomerId);

    res.status(200).json({
      status: "success",
      data: { url: session.url },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current subscription details
// @route   GET /api/stripe/subscription
// @access  Organization only
const getSubscription = async (req, res, next) => {
  try {
    res.status(200).json({
      status: "success",
      data: {
        subscriptionPlan: req.organization.subscriptionPlan,
        subscriptionStatus: req.organization.subscriptionStatus,
        subscriptionEndDate: req.organization.subscriptionEndDate,
        maxStudents: req.organization.maxStudents,
        maxInstructors: req.organization.maxInstructors,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel subscription
// @route   POST /api/stripe/cancel
// @access  Organization only
const cancelSubscription = async (req, res, next) => {
  try {
    const org = req.organization;
    if (!org.stripeSubscriptionId) {
      return next(new AppError("No active subscription found.", 404));
    }

    await stripeService.cancelSubscription(org.stripeSubscriptionId);

    // Don't update DB here, wait for webhook
    res.status(200).json({
      status: "success",
      message: "Subscription canceled. It will remain active until the end of the billing period.",
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// STRIPE WEBHOOK HANDLER
// ────────────────────────────────────────────────────────────────

// @desc    Handle Stripe Webhook Events
// @route   POST /api/stripe/webhook
// @access  Public (from Stripe)
const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // req.body must be RAW bytes (Buffer)
    event = stripeService.constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;

        const orgId = session.metadata.orgId;
        const org = await Organization.findById(orgId);
        if (!org) break;

        // Retrieve subscription details to determine the plan
        const checkoutSession = await stripeService.retrieveCheckoutSession(session.id);
        const subscription = checkoutSession.subscription;
        
        let plan = "none";
        let maxStudents = 0;
        let maxInstructors = 0;

        const priceId = subscription.items.data[0].price.id;
        if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) {
          plan = "standard";
          maxStudents = 100;
          maxInstructors = 10;
        } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          plan = "premium";
          maxStudents = 999999;
          maxInstructors = 999999;
        }

        org.stripeSubscriptionId = subscription.id;
        org.subscriptionPlan = plan;
        org.subscriptionStatus = subscription.status; // "active" or "trialing"
        if (subscription.current_period_start) {
          org.subscriptionStartDate = new Date(subscription.current_period_start * 1000);
        }
        if (subscription.current_period_end) {
          org.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        }
        org.maxStudents = maxStudents;
        org.maxInstructors = maxInstructors;
        
        await org.save();
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const org = await Organization.findOne({ stripeSubscriptionId: subscription.id });
        if (!org) break;

        let plan = "none";
        let maxStudents = 0;
        let maxInstructors = 0;

        const priceId = subscription.items.data[0].price.id;
        if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) {
          plan = "standard";
          maxStudents = 100;
          maxInstructors = 10;
        } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          plan = "premium";
          maxStudents = 999999;
          maxInstructors = 999999;
        }

        org.subscriptionPlan = plan;
        org.subscriptionStatus = subscription.status;
        if (subscription.current_period_start) {
          org.subscriptionStartDate = new Date(subscription.current_period_start * 1000);
        }
        if (subscription.current_period_end) {
          org.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        }
        
        // If it's canceling at period end, status is still 'active', but we could note it
        // If canceled immediately, status becomes 'canceled'
        if (subscription.status === "active") {
          org.maxStudents = maxStudents;
          org.maxInstructors = maxInstructors;
        }

        await org.save();
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const org = await Organization.findOne({ stripeSubscriptionId: subscription.id });
        if (!org) break;

        org.subscriptionStatus = "canceled";
        org.subscriptionPlan = "none";
        org.maxStudents = 0;
        org.maxInstructors = 0;
        // Don't clear stripeCustomerId, they can resubscribe
        org.stripeSubscriptionId = "";
        
        await org.save();
        break;
      }
      
      case "invoice.payment_failed": {
         const invoice = event.data.object;
         if (invoice.subscription) {
            const org = await Organization.findOne({ stripeSubscriptionId: invoice.subscription });
            if (org) {
               org.subscriptionStatus = "past_due";
               await org.save();
            }
         }
         break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

module.exports = {
  createCheckout,
  getBillingPortal,
  getSubscription,
  cancelSubscription,
  handleWebhook,
};
