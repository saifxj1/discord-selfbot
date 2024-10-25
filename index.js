const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require("@discordjs/voice");
const request = require('request');
const fs = require('fs');
const { api } = require('selfcord-js-v14');

const client = new Client({ checkUpdate: false });
const config = require(`${process.cwd()}/config.json`);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const token = config.Token;
    changeStatusesPeriodically(token);

    await api(); 

    if (config.Guild && config.Channel) {
        await joinVC(client, config);
    } else {
        console.error('No Guild or Channel specified in config.');
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const oldVoice = oldState.channelId;
    const newVoice = newState.channelId;

    if (oldVoice !== newVoice) {
        if (!oldVoice) {
            // Joined a voice channel
        } else if (!newVoice) {
            // Left a voice channel
            if (oldState.member.id !== client.user.id) return;
            if (config.Guild && config.Channel) {
                await joinVC(client, config);
            }
        } else {
            // Switched voice channels
            if (oldState.member.id !== client.user.id) return;
            if (newVoice !== config.Channel) {
                if (config.Guild && config.Channel) {
                    await joinVC(client, config);
                }
            }
        }
    }
});

client.login(config.Token);

async function joinVC(client, config) {
    const guild = client.guilds.cache.get(config.Guild);
    if (!guild) {
        console.error('Guild not found in cache.');
        return;
    }

    const voiceChannel = guild.channels.cache.get(config.Channel);
    if (!voiceChannel) {
        console.error('Voice channel not found in guild.');
        return;
    }

    joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
    });
}

function change_status(token, status, emoji_name = '', emoji_id = null) {
    const options = {
        url: "https://discord.com/api/v10/users/@me/settings",
        headers: {
            'Authorization': token
        },
        json: true,
        body: {
            custom_status: {
                text: status,
                emoji_name: emoji_name,
                emoji_id: emoji_id
            }
        }
    };

    request.patch(options, (error, response, body) => {
        if (error) {
            console.error('Error al cambiar el estado:', error);
        } else {
            console.log('Estado cambiado a:', status);
        }
    });
}

function readStatusesFromFile(filePath) {
    const statuses = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    return statuses;
}

async function changeStatusesPeriodically(token) {
    const statuses = readStatusesFromFile('text.txt');
    let index = 0;

    while (true) {
        let status = statuses[index];
        let emoji_name = '';
        let emoji_id = null;

        if (status.includes('emoji:')) {
            const emojiDefinition = status.split('emoji:')[1].trim();
            const emojiParts = emojiDefinition.split(':');
            emoji_name = emojiParts[0];
            emoji_id = emojiParts[1] || null;

            status = status.split('emoji:')[0].trim();
        }

        change_status(token, status, emoji_name, emoji_id);

        index = (index + 1) % statuses.length;

        await new Promise(resolve => setTimeout(resolve, 2500));
    }
}
