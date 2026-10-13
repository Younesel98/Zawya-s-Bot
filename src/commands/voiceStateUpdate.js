const { ChannelType } = require('discord.js');

// Ensure global store exists for channel tracking
if (!global.tempChannelData) {
    global.tempChannelData = new Map();
}

const JOIN_TO_CREATE_ID = 'YOUR_JOIN_TO_CREATE_CHANNEL_ID'; // Replace with your channel ID

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        // ==========================================
        // 1. CREATE TEMP CHANNEL ON JOIN
        // ==========================================
        if (newState.channelId === JOIN_TO_CREATE_ID) {
            const member = newState.member;
            const guild = newState.guild;

            try {
                // Create temporary channel
                const newChannel = await guild.channels.create({
                    name: `🔊 ${member.user.username}'s Channel`,
                    type: ChannelType.GuildVoice,
                    parent: newState.channel.parentId,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: ['Connect', 'ManageChannels', 'MoveMembers', 'Speak'],
                        },
                    ],
                });

                // Store channel data (antiAbuse is FALSE by default)
                global.tempChannelData.set(newChannel.id, {
                    ownerId: member.id,
                    antiAbuse: false,
                });

                // Move creator into the newly created room
                await member.voice.setChannel(newChannel);
            } catch (error) {
                console.error('Error creating temporary voice channel:', error);
            }
        }

        // ==========================================
        // 2. ENFORCE ANTI-ABUSE PROTECTION
        // ==========================================
        if (newState.channel && oldState.channelId !== newState.channelId) {
            const channelId = newState.channelId;
            const channelData = global.tempChannelData.get(channelId);

            // If Anti-Abuse is enabled for this temp channel
            if (channelData && channelData.antiAbuse) {
                const member = newState.member;

                // Always allow the owner
                if (member.id !== channelData.ownerId) {
                    // Disconnect unauthorized member immediately
                    try {
                        await member.voice.disconnect('Anti-Abuse Enabled');

                        // Notify channel owner via DM (optional)
                        const owner = await newState.guild.members.fetch(channelData.ownerId).catch(() => null);
                        if (owner) {
                            owner.send(`🛡️ **Anti-Abuse Triggered:** Disconnected **${member.user.tag}** from your voice channel.`).catch(() => {});
                        }
                    } catch (err) {
                        console.error('Failed to disconnect user via Anti-Abuse:', err);
                    }
                }
            }
        }

        // ==========================================
        // 3. DELETE TEMP CHANNEL WHEN EMPTY
        // ==========================================
        if (oldState.channel && global.tempChannelData.has(oldState.channelId)) {
            const oldChannel = oldState.channel;

            // If no members left in temp channel, delete it
            if (oldChannel.members.size === 0) {
                global.tempChannelData.delete(oldChannel.id);
                await oldChannel.delete().catch(() => {});
            }
        }
    },
};
