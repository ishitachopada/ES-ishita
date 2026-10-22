require('dotenv').config();
const express = require('express');
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const csrf = require('csurf');
const createSecurityMiddleware = require('./middleware/securityMiddleware');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const passport = require('./config/passport');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => logger.info('MongoDB connected'))
.catch(err => logger.error('MongoDB connection error: %o', err));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
try {
    fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
    logger.warn('Could not ensure uploads directory exists: %s', e.message);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(createSecurityMiddleware());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('combined'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(csrf());
app.use(flash());
app.use(passport.initialize());

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = {
        error: req.flash('error'),
        success: req.flash('success')
    };
    res.locals.csrfToken = req.csrfToken();
    res.locals.SOCKET_IO = true;
    next();
});

app.use('/', require('./routes/authRoutes'));
app.use('/exams', require('./routes/examRoutes'));
app.use('/admin', require('./routes/adminRoutes'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/session-ended', (req, res) => {
    res.render('sessionEnded');
});

app.use((req, res) => {
    res.status(404).render('404');
});

app.use(errorHandler);

io.on('connection', (socket) => {
    socket.on('join-submission', (submissionId) => {
        if (submissionId) socket.join(`submission:${submissionId}`);
    });
    socket.on('join-admin', () => socket.join('admins'));
    socket.on('join-user', (userId) => {
        if (userId) socket.join(`user:${userId}`);
    });
    socket.on('join-exam', (examId) => {
        if (examId) socket.join(`exam:${examId}`);
    });
});

app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
