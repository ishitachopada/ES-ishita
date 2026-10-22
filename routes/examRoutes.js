const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', examController.getExams);
router.get('/take/:id', examController.getExam);
router.post('/submit/:id', examController.submitExam);
router.get('/results/:id', examController.getResults);
router.get('/my-results', examController.getMyResults);
router.get('/certificate/:id', examController.getCertificate);
router.post('/invalidate/:submissionId', examController.invalidateExam);

router.get('/api/notifications', examController.getNotifications);
router.post('/api/notifications/clear', examController.clearNotifications);

module.exports = router;