const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole, allowRoles } = require('../middleware/roleMiddleware');

// Multer storage for question images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join('public', 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, 'q-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });
const excelUpload = multer({ storage });

router.use(requireAuth);
router.use(allowRoles('admin', 'faculty'));

router.get('/dashboard', adminController.getDashboard);
router.get('/create-exam', adminController.getCreateExam);
router.post('/create-exam', upload.array('questionImages'), adminController.postCreateExam);
router.get('/download-mcq-template', adminController.downloadMcqTemplate);
router.post('/import-mcq-excel', excelUpload.single('mcqExcel'), adminController.importMcqExcel);
router.get('/manage-exams', adminController.getManageExams);
router.get('/toggle-exam/:id', requireRole('admin'), adminController.toggleExamStatus);
router.post('/exams/:id/toggle-reveal', requireRole('admin'), adminController.toggleRevealAnswers);
router.get('/exam-reports', adminController.getExamReports);
router.get('/exam-reports/:id', adminController.getExamReportDetail);
router.post('/exam-reports/reset/:id', requireRole('admin'), adminController.resetSubmission);
router.post('/exam-reports/:id/manual-grade', adminController.postManualGrade);
// Autosave JSON endpoint for per-answer updates
router.post('/exam-reports/:id/answers/:idx', adminController.updateAnswerJson);
// Faculty and student management
router.get('/manage-faculty', requireRole('admin'), adminController.getManageFaculty);
router.post('/manage-faculty', requireRole('admin'), adminController.postCreateFaculty);
router.get('/students-by-faculty', requireRole('admin'), adminController.getStudentsByFaculty);
router.post('/assign-student-faculty', requireRole('admin'), adminController.assignStudentFaculty);
router.get('/invalidated', adminController.getInvalidatedSubmissions);
// alias for convenience
router.get('/exam-invalidated', adminController.getInvalidatedSubmissions);
router.get('/assign-exam/:id', requireRole('admin'), adminController.getAssignExam);
router.post('/assign-exam/:id', requireRole('admin'), adminController.postAssignExam);
router.get('/edit-exam/:id', requireRole('admin'), adminController.getEditExam);
router.post('/edit-exam/:id', requireRole('admin'), upload.array('questionImages'), adminController.postEditExam);
// Category routes
router.get('/manage-categories', requireRole('admin'), adminController.getManageCategories);
router.post('/manage-categories', requireRole('admin'), adminController.postCreateCategory);
router.get('/edit-category/:id', requireRole('admin'), adminController.getEditCategory);
router.post('/edit-category/:id', requireRole('admin'), adminController.postEditCategory);
router.get('/delete-category/:id', requireRole('admin'), adminController.deleteCategory);

// Notifications
router.get('/notifications', requireRole('admin'), adminController.getNotificationsPage);
router.post('/notifications/send', requireRole('admin'), adminController.sendNotification);

module.exports = router;