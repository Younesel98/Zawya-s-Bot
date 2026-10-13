const { SlashCommandBuilder } = require('discord.js');
// Import database helper if needed depending on your project structure, or use client methods
const { getTemporaryChannelInfo } = require('../../../utils/database.js'); // Adjust path if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limit')
        .setDescription('Set the user limit for your temporary voice channel.')
        .addIntegerOption(option =>
            option.setName('slots')
                .setDescription('Maximum allowed users (0 for unlimited)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(99)
        ),
    async execute(interaction, client) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be in your temporary voice channel to use this command.', ephemeral: true });
        }

        const tempInfo = await getTemporaryChannelInfo(client, interaction.guild.id, voiceChannel.id);

        if (!tempInfo) {
            return interaction.reply({ content: '❌ This is not a registered temporary voice channel.', ephemeral: true });
        }

        if (tempInfo.ownerId !== member.id) {
            return interaction.reply({ content: '❌ Only the owner of this temporary voice channel can change its limit.', ephemeral: true });
        }

        const limit = interaction.options.getInteger('slots');

        try {
            await voiceChannel.setUserLimit(limit);
            return interaction.reply({ content: `✅ Voice limit updated to **${limit === 0 ? 'Unlimited' : limit}** slots.`, ephemeral: true });
        } catch (error) {
            console.error('Error setting limit:', error);
            return interaction.reply({ content: '❌ Failed to set the limit.', ephemeral: true });
        }
    },
};
