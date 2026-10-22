const User = require('../models/User');

const requireAuth = async (req, res, next) => {
    if (!req.session || !req.session.user) {
        req.flash('error', 'Please login first');
        return res.redirect('/login');
    }

    const dbUser = await User.findById(req.session.user._id).select('+password');
    if (!dbUser || dbUser.sessionToken !== req.session.sessionToken) {
        req.session.destroy(() => {
            return res.status(403).render('sessionEnded');
        });
        return;
    }

    req.user = dbUser;
    res.locals.user = dbUser;
    next();
};

const requireGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    next();
};

module.exports = {
    requireAuth,
    requireGuest
};
