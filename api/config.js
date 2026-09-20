const { isLaunchOfferActive, getLaunchOfferEndDate } = require('../lib/products');

// Public, non-sensitive config the frontend needs (e.g. to render the
// launch-offer countdown). Never put secrets here.
module.exports = function handler(req, res) {
  return res.status(200).json({
    launchOfferActive: isLaunchOfferActive(),
    launchOfferEndsAt: getLaunchOfferEndDate(),
  });
};
