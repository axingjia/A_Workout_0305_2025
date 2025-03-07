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
const NoteSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
}, { timestamps: true });
NoteSchema.index({ title: 'text', content: 'text' });
const Note = mongoose.model('Note', NoteSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB Connection


// mongoose.connect(process.env.MONGO_URI, {
mongoose.connect('mongodb://127.0.0.1:27017/myapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Note Routes
app.get('/api/notes', authenticate, async (req, res) => {
    const notes = await Note.find({ user: req.user.id });
    res.json(notes);
});

app.post('/api/notes', authenticate, async (req, res) => {
    const { title, content } = req.body;
    const note = new Note({ user: req.user.id, title, content });
    await note.save();
    res.status(201).json(note);
});

app.put('/api/notes/:id', authenticate, async (req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note || note.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    
    const { title, content } = req.body;
    note.title = title;
    note.content = content;
    await note.save();

    res.json(note);
});

app.delete('/api/notes/:id', authenticate, async (req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note || note.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    
    await note.deleteOne();
    res.json({ message: 'Note deleted' });
});

app.get('/api/search', authenticate, async (req, res) => {
    const { q } = req.query;
    const notes = await Note.find({
        user: req.user.id,
        $text: { $search: q },
    });
    res.json(notes);
});

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
