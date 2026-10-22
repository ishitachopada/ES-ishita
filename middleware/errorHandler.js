const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err);
    if (res.headersSent) {
        return next(err);
    }
    const status = err.status || 500;
    if (req.xhr || req.accepts('json') === 'json') {
        return res.status(status).json({ ok: false, message: err.message || 'Server error' });
    }
    req.flash('error', err.message || 'Server error');
    return res.status(status).render('error', { error: err });
};

module.exports = errorHandler;
