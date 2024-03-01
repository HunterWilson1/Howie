require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const soundsFolder = './sounds'; // Ensure this directory exists and contains .mp3 files

async function performVoiceChannelAction() {
    console.log('Checking all guilds for active voice channels...');
    const guilds = client.guilds.cache.map(guild => guild);

    for (const guild of guilds) {
        console.log(`Checking guild: ${guild.name}`);

        // Attempt to find a voice channel that is not empty
        let targetChannel = null;
        for (const [channelId, channel] of guild.channels.cache.entries()) {
            if (channel.type === 'GUILD_VOICE' && 
                channel.members.size > 0 && // Check if there are users in the channel
                channel.joinable && 
                channel.speakable && 
                channel.permissionsFor(guild.me).has(['VIEW_CHANNEL', 'CONNECT', 'SPEAK'])) {
                targetChannel = channel;
                break; // Break the loop once we find a suitable channel
            }
        }

        if (targetChannel) {
            console.log(`Attempting to join: ${targetChannel.name} in ${guild.name}, Members present: ${targetChannel.members.size}`);
            try {
                const connection = joinVoiceChannel({
                    channelId: targetChannel.id,
                    guildId: targetChannel.guild.id,
                    adapterCreator: targetChannel.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                connection.subscribe(player);

                player.on('stateChange', (oldState, newState) => {
                    if (newState.status === 'idle') {
                        console.log(`Finished playing audio in ${targetChannel.name}. Leaving the channel.`);
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
                        console.log(`Playing audio file: ${randomFile} in ${targetChannel.name}`);
                    } else {
                        console.log('No MP3 files found in the sounds folder.');
                        connection.destroy(); // Leave if there's nothing to play
                    }
                });
                return; // Exit the function once a channel is successfully joined
            } catch (error) {
                console.error(`Error joining voice channel: ${error}`);
            }
        } else {
            console.log(`No active voice channels found in ${guild.name} or missing permissions.`);
        }
    }
}


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // Schedule the bot to join a channel at random intervals
    const minInterval = 5 * 60 * 1000; // 5 minutes
    const maxInterval = 10 * 60 * 1000; // 10 minutes

    const performActionAtRandomInterval = () => {
        const delay = Math.random() * (maxInterval - minInterval) + minInterval;
        setTimeout(() => {
            performVoiceChannelAction(); // Perform the join, play, leave actions
            performActionAtRandomInterval(); // Schedule the next execution
        }, delay);
    };

    performActionAtRandomInterval(); // Start the loop
});

client.login(process.env.DISCORD_BOT_TOKEN);
