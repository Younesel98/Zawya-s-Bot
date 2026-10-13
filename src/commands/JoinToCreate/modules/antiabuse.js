import { SlashCommandBuilder } from 'discord.js';
import { getJoinToCreateConfig, getTemporaryChannelInfo } from '../../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('antiabuse')
        .setDescription('Protect your temp voice channel from unauthorized joins.')
        .addBooleanOption(option =>
            option.setName('enable')
                .setDescription('Turn anti-abuse on or off')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be in your temporary voice channel to use this command.', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const tempInfo = await getTemporaryChannelInfo(client, guildId, voiceChannel.id);

        if (!tempInfo) {
            return interaction.reply({ content: '❌ This is not a registered temporary voice channel.', ephemeral: true });
        }

        if (tempInfo.ownerId !== member.id) {
            return interaction.reply({ content: '❌ Only the owner of this temporary channel can toggle anti-abuse.', ephemeral: true });
        }

        const enable = interaction.options.getBoolean('enable');

        const config = await getJoinToCreateConfig(client, guildId);
        if (config.temporaryChannels && config.temporaryChannels[voiceChannel.id]) {
            config.temporaryChannels[voiceChannel.id].antiAbuse = enable;
            await client.db.set(`guild:${guildId}:jointocreate`, config);
        }

        if (enable) {
            return interaction.reply({ content: '🛡️ **Anti-Abuse Enabled!** Any unauthorized users attempting to join will be automatically disconnected.', ephemeral: true });
        } else {
            return interaction.reply({ content: '🔓 **Anti-Abuse Disabled.**', ephemeral: true });
        }
    },
};
