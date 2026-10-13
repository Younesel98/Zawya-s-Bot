const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antiabuse')
        .setDescription('Protect your temp voice channel from unauthorized joins/role abuse.')
        .addBooleanOption(option =>
            option.setName('enable')
                .setDescription('Turn anti-abuse on or off')
                .setRequired(true)
        ),
    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be in your temporary voice channel to use this command.', ephemeral: true });
        }

        const channelData = global.tempChannelData?.get(voiceChannel.id);

        if (!channelData) {
            return interaction.reply({ content: '❌ This is not a registered temporary voice channel.', ephemeral: true });
        }

        if (channelData.ownerId !== member.id) {
            return interaction.reply({ content: '❌ Only the owner of this temporary channel can toggle anti-abuse.', ephemeral: true });
        }

        const enable = interaction.options.getBoolean('enable');
        channelData.antiAbuse = enable;

        if (enable) {
            return interaction.reply({ content: '🛡️ **Anti-Abuse Enabled!** Any unauthorized members attempting to join will be disconnected automatically.', ephemeral: true });
        } else {
            return interaction.reply({ content: '🔓 **Anti-Abuse Disabled.**', ephemeral: true });
        }
    },
};
