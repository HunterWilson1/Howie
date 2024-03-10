require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const soundsFolder = './sounds'; // Ensure this directory exists and contains .mp3 files
let joinInterval = null;
let lastVoiceChannel = null;

async function performVoiceChannelAction(voiceChannel) {
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
                connection.destroy(); // Leave the channel after playing audio
            }
        });

        fs.readdir(soundsFolder, (err, files) => {
            if (err) {
                console.error('Could not list the directory.', err);
                return;
            }

            const mp3Files = files.filter(file => file.endsWith('.mp3'));
            if (mp3Files.length > 0) {
                const randomIndex = Math.floor(Math.random() * mp3Files.length);
                const randomFile = mp3Files[randomIndex];
                const resource = createAudioResource(`${soundsFolder}/${randomFile}`);
                player.play(resource);
                console.log(`Playing audio file: ${randomFile} in ${voiceChannel.name}`);
            } else {
                console.log('No MP3 files found in the sounds folder.');
                connection.destroy(); // Leave if there's nothing to play
            }
        });
    } catch (error) {
        console.error(`Error joining voice channel: ${error}`);
    }
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === 'hey howie') {
        const memberVoiceChannel = message.member.voice.channel;
        if (!memberVoiceChannel) {
            return message.reply("You need to be in a voice channel for me to respond!");
        }
        message.reply("Yes, I'm here, still sitting in the voice chat.");
        lastVoiceChannel = memberVoiceChannel;
    }

    if (message.content.toLowerCase() === "summon") {
        // Send an image directly without using MessageAttachment
        await message.channel.send({ files: ['./images/IMG_0235.jpg'] }); // Make sure this path is correct

        const memberVoiceChannel = message.member.voice.channel;
        if (!memberVoiceChannel) {
            return message.reply("You need to be in a voice channel to hear my sacred treasure!");
        }

        const connection = joinVoiceChannel({
            channelId: memberVoiceChannel.id,
            guildId: memberVoiceChannel.guild.id,
            adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);
        const resource = createAudioResource(`${soundsFolder}/mahoraga.mp3`);
        player.play(resource);

        player.on('stateChange', (oldState, newState) => {
            if (newState.status === 'idle') { // This means the audio has finished playing
                console.log(`Finished playing audio in ${memberVoiceChannel.name}. Leaving the channel.`);
                connection.destroy(); // Leave the voice channel
            }
        });
    }

    if (message.content.startsWith('!join')) {
        const memberVoiceChannel = message.member.voice.channel;
        if (!memberVoiceChannel) {
            return message.reply("You need to be in a voice channel for me to join!");
        }
        lastVoiceChannel = memberVoiceChannel;
        if (joinInterval) {
            clearInterval(joinInterval);
        }
        joinInterval = setInterval(() => {
            if (lastVoiceChannel) {
                performVoiceChannelAction(lastVoiceChannel);
            } else {
                console.log("No last known voice channel to join.");
                if (joinInterval) {
                    clearInterval(joinInterval);
                }
            }
        }, Math.random() * (600000 - 300000) + 300000); // Random time between 5 and 10 minutes
        message.reply(`I will join ${memberVoiceChannel.name} every 5-10 minutes.`);
    } else if (message.content.startsWith('!stop') && joinInterval) {
        clearInterval(joinInterval);
        joinInterval = null;
        lastVoiceChannel = null;
        message.reply("I've stopped the automatic rejoining.");
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
