require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const mysql = require('mysql2/promise');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const soundsFolder = './sounds';
let joinInterval = null;
let lastVoiceChannel = null;
let mode = null;

async function performVoiceChannelAction(voiceChannel, mode) {
    try {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        player.on('stateChange', (oldState, newState) => {
            if (newState.status === 'idle') {
                console.log(`Finished playing audio in ${voiceChannel.name}. Leaving the channel.`);
                connection.destroy();
            }
        });

        let folderPath;
        if (mode === 'moderate') {
            folderPath = path.join(soundsFolder, 'moderate');
        } else if (mode === 'offensive') {
            folderPath = path.join(soundsFolder, 'offensive');
        } else if (mode === 'random') {
            folderPath = path.join(soundsFolder, 'random');
        }

        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error('Could not list the directory.', err);
                return;
            }

            const mp3Files = files.filter(file => file.endsWith('.mp3'));
            if (mp3Files.length > 0) {
                const randomIndex = Math.floor(Math.random() * mp3Files.length);
                const randomFile = mp3Files[randomIndex];
                const resource = createAudioResource(path.join(folderPath, randomFile));
                player.play(resource);
                console.log(`Playing audio file: ${randomFile} in ${voiceChannel.name}`);
            } else {
                console.log('No MP3 files found in the sounds folder.');
                connection.destroy();
            }
        });
    } catch (error) {
        console.error(`Error joining voice channel: ${error}`);
    }
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    if (args[0] === '!addLine') {
        const type = args[1];
        const line = args.slice(2).join(' ');

        let query;
        if (type === 'moderate') {
            query = 'INSERT INTO moderate_lines (line) VALUES (?)';
        } else if (type === 'offensive') {
            query = 'INSERT INTO explicit_lines (line) VALUES (?)';
        } else if (type === 'random') {
            query = 'INSERT INTO random_lines (line) VALUES (?)';
        } else if (type === 'tailored') {
            query = 'INSERT INTO tailored_lines (user_id, line) VALUES (?, ?)';
        } else {
            message.reply('Invalid line type. Use "moderate", "offensive", "random", or "tailored".');
            return;
        }

        try {
            if (type === 'tailored') {
                await pool.query(query, [message.author.id, line]);
            } else {
                await pool.query(query, [line]);
            }
            message.reply('Line added successfully.');
        } catch (error) {
            console.error('Error adding line:', error);
            message.reply('There was an error adding the line.');
        }
    } else if (args[0] === '!start') {
        if (message.member.voice.channel) {
            lastVoiceChannel = message.member.voice.channel;
            message.reply('Which mode would you like to start? Use `!mode moderate`, `!mode offensive`, or `!mode random`.');
        } else {
            message.reply('You need to be in a voice channel to start the bot.');
        }
    } else if (args[0] === '!mode') {
        const selectedMode = args[1];
        if (['moderate', 'offensive', 'random'].includes(selectedMode)) {
            mode = selectedMode;
            message.reply(`Mode set to ${mode}.`);
            if (joinInterval) {
                clearInterval(joinInterval);
            }
            joinInterval = setInterval(() => {
                if (lastVoiceChannel && mode) {
                    performVoiceChannelAction(lastVoiceChannel, mode);
                } else {
                    console.log('No last known voice channel or mode to join.');
                    if (joinInterval) {
                        clearInterval(joinInterval);
                    }
                }
            }, Math.random() * (600000 - 300000) + 300000); // Random time between 5 and 10 minutes
        } else {
            message.reply('Invalid mode. Use `!mode moderate`, `!mode offensive`, or `!mode random`.');
        }
    } else if (args[0] === '!stop' && joinInterval) {
        clearInterval(joinInterval);
        joinInterval = null;
        lastVoiceChannel = null;
        mode = null;
        message.reply("I've stopped the automatic rejoining.");
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
