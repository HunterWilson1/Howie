require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    try {
        // Create a connection to the MySQL server
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        // Create the database if it does not exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.end();

        // Create a database connection pool
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS moderate_lines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                line TEXT NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS explicit_lines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                line TEXT NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS random_lines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                line TEXT NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tailored_lines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                line TEXT NOT NULL
            );
        `);

        console.log('Database setup successfully!');
    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

setupDatabase();
