require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, connectDB } = require('../app'); // Adjust path if needed
const User = require('../models/User');
const Note = require('../models/Note');

let mongoServer;
let token;

beforeAll(async () => {
    // mongoServer = await MongoMemoryServer.create();
    // const uri = mongoServer.getUri();
    // await mongoose.connect(uri);

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Disconnect existing connection if necessary
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    // Create a test user
    await request(app)
        .post('/api/auth/signup')
        .send({ username: 'testuser', password: 'password123' });

    const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

    token = res.body.token;
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe('Notes API', () => {
    let noteId;

    test('Create a note', async () => {
        const res = await request(app)
            .post('/api/notes')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Test Note', content: 'This is a test note' });

        expect(res.statusCode).toBe(201);
        expect(res.body.title).toBe('Test Note');
        noteId = res.body._id;
    });

    test('Fetch notes', async () => {
        const res = await request(app)
            .get('/api/notes')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('Update a note', async () => {
        const res = await request(app)
            .put(`/api/notes/${noteId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Updated Note', content: 'Updated content' });

        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Updated Note');
    });

    test('Delete a note', async () => {
        const res = await request(app)
            .delete(`/api/notes/${noteId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
    });

    test('Search for a note', async () => {
        await request(app)
            .post('/api/notes')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Searchable Note', content: 'This is a searchable note' });

        const res = await request(app)
            .get('/api/search?q=Searchable')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });
});
