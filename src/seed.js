require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Create a database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function seedDatabase() {
    const soundsFolder = './sounds';
    const moderateFolder = path.join(soundsFolder, 'moderate');
    const offensiveFolder = path.join(soundsFolder, 'offensive');
    const randomFolder = path.join(soundsFolder, 'random');
    const tailoredFolder = path.join(soundsFolder, 'tailored');

    try {
        const moderateFiles = await fs.promises.readdir(moderateFolder);
        const offensiveFiles = await fs.promises.readdir(offensiveFolder);
        const randomFiles = await fs.promises.readdir(randomFolder);
        const tailoredFiles = await fs.promises.readdir(tailoredFolder);

        // Filter and map to full path
        const moderateLines = moderateFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => path.join(moderateFolder, file));

        const offensiveLines = offensiveFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => path.join(offensiveFolder, file));

        const randomLines = randomFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => path.join(randomFolder, file));

        const tailoredLines = tailoredFiles
            .filter(file => file.endsWith('.mp3'))
            .map(file => path.join(tailoredFolder, file));

        // Seed moderate lines
        for (const file of moderateLines) {
            await pool.query('INSERT INTO moderate_lines (line) VALUES (?)', [file]);
        }

        // Seed offensive lines
        for (const file of offensiveLines) {
            await pool.query('INSERT INTO explicit_lines (line) VALUES (?)', [file]);
        }

        // Seed random lines
        for (const file of randomLines) {
            // Assuming you have a separate table for random lines, create one if needed
            await pool.query('INSERT INTO random_lines (line) VALUES (?)', [file]);
        }

        // Seed tailored lines
        for (const file of tailoredLines) {
            await pool.query('INSERT INTO tailored_lines (user_id, line) VALUES (?, ?)', ['default_user_id', file]);
        }

        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await pool.end();
    }
}

seedDatabase();
