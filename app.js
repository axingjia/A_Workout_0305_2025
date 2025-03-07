require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const app = express();
// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

const User = require('./models/User');
const Note = require('./models/Note');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Access denied' });
    
    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// MongoDB Models

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Notes API',
            version: '1.0.0',
            description: 'A simple API for managing notes',
        },
        servers: [{ url: 'http://localhost:5000' }],
    },
    apis: ['./app.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB Connection


const connectDB = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    }
};
connectDB();


// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// }).then(() => console.log('MongoDB Connected'))
// .catch(err => console.error('MongoDB Connection Error:', err));



/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    console.log("###body is");
    console.log(req.body);
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
});


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in to an existing user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns an access token
 */
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});


/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get all notes for the authenticated user
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of notes
 */
// Note Routes
app.get('/api/notes', authenticate, async (req, res) => {
    const notes = await Note.find({ user: req.user.id });
    res.json(notes);
});


/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a new note
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note created successfully
 */
app.post('/api/notes', authenticate, async (req, res) => {
    const { title, content } = req.body;
    const note = new Note({ user: req.user.id, title, content });
    await note.save();
    res.status(201).json(note);
});


/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update an existing note
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 */
app.put('/api/notes/:id', authenticate, async (req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note || note.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    
    const { title, content } = req.body;
    note.title = title;
    note.content = content;
    await note.save();

    res.json(note);
});


/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted successfully
 */
app.delete('/api/notes/:id', authenticate, async (req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note || note.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    
    await note.deleteOne();
    res.json({ message: 'Note deleted' });
});


/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search for notes based on keywords
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching notes
 */
app.get('/api/search', authenticate, async (req, res) => {
    const { q } = req.query;
    const notes = await Note.find({
        user: req.user.id,
        $text: { $search: q },
    });
    res.json(notes);
});


/**
 * @swagger
 * /api/notes/{id}/share:
 *   post:
 *     summary: Share a note with another user
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note shared successfully
 */
app.post('/api/notes/:id/share', authenticate, async (req, res) => {
    const { userId } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note || note.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    
    const userToShare = await User.findById(userId);
    if (!userToShare) return res.status(404).json({ message: 'User not found' });
    
    if (!note.sharedWith.includes(userId)) {
        note.sharedWith.push(userId);
        await note.save();
    }

    res.json({ message: 'Note shared successfully', note });
});


// Unit Tests
if (process.env.NODE_ENV === 'test') {
    module.exports = app;
} else {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, connectDB };
