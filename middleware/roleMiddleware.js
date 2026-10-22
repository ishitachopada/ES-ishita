const requireRole = (role) => (req, res, next) => {
    if (!req.user || req.user.role !== role) {
        req.flash('error', 'Access denied');
        return res.redirect('/');
    }
    next();
};

const allowRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        req.flash('error', 'Access denied');
        return res.redirect('/');
    }
    next();
};

module.exports = {
    requireRole,
    allowRoles
};
