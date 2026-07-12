const Organization = require("../models/Organization");
const { AppError } = require("../utils/errorUtils");

// ── loadOrganization: finds the Organization doc for the logged-in org user ──
// Must be used AFTER protect() + authorize("organization").
// Attaches req.organization for downstream controllers.
const loadOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findOne({ owner: req.user._id });
    if (!org) {
      return next(
        new AppError("Organization profile not found. Please contact support.", 404)
      );
    }
    req.organization = org;
    next();
  } catch (err) {
    next(err);
  }
};

// ── requireActiveSubscription: guards routes that need a paid plan ────────
// Returns 403 with a clear message if the org has no active subscription.
const requireActiveSubscription = (req, res, next) => {
  const org = req.organization;
  if (!org) {
    return next(new AppError("Organization not loaded.", 500));
  }
  if (org.subscriptionStatus !== "active" || org.subscriptionPlan === "none") {
    return next(
      new AppError(
        "An active subscription is required to use this feature. Please subscribe to a plan.",
        403
      )
    );
  }
  next();
};

module.exports = { loadOrganization, requireActiveSubscription };
