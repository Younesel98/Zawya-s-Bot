import { ChannelType, PermissionFlagsBits } from 'discord.js';
import {
    getJoinToCreateConfig, 
    registerTemporaryChannel, 
    unregisterTemporaryChannel,
    getTemporaryChannelInfo,
    formatChannelName
} from '../utils/database.js';
import { sanitizeInput } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleMusicVoiceState } from '../services/music/musicVoiceState.js';

const channelCreationCooldown = new Map();
const VOICE_CREATE_COOLDOWN_MS = 2000;
const DEFAULT_VOICE_BITRATE = 64000;
const MAX_VOICE_BITRATE = 384000;
const MIN_VOICE_BITRATE = 8000;
const MAX_CHANNEL_NAME_LENGTH = 100;
const FALLBACK_CHANNEL_NAME = 'Voice Room';
const MAX_TRACKED_COOLDOWNS = 10000;

export default {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        if (newState.member.user.bot) return;

        const guildId = newState.guild.id;
        const userId = newState.member.id;
        const cooldownKey = `${guildId}-${userId}`;
        cleanupCooldownEntries();

        try {
            // ==========================================
            // 🛡️ ANTI-ABUSE ENFORCEMENT CHECK
            // ==========================================
            if (newState.channel && oldState.channelId !== newState.channel.id) {
                const tempChannelInfo = await getTemporaryChannelInfo(client, guildId, newState.channel.id);
                if (tempChannelInfo && tempChannelInfo.antiAbuse) {
                    const member = newState.member;
                    // If someone other than the owner tries to join while anti-abuse is on
                    if (member.id !== tempChannelInfo.ownerId) {
                        try {
                            await member.voice.disconnect('Anti-Abuse Protection Enabled');
                            logger.info(`Anti-abuse disconnected unauthorized user ${member.id} from channel ${newState.channel.id}`);
                            return; // Stop further execution for this event
                        } catch (err) {
                            logger.error('Failed to disconnect user via anti-abuse:', err);
                        }
                    }
                }
            }
            // ==========================================

            const config = await getJoinToCreateConfig(client, guildId);

            if (!config.enabled || config.triggerChannels.length === 0) {
                return;
            }

            if (!oldState.channel && newState.channel) {
                await handleVoiceJoin(client, newState, config);
            }

            if (oldState.channel && !newState.channel) {
                await handleVoiceLeave(client, oldState, config);
            }

            if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                await handleVoiceMove(client, oldState, newState, config);
            }

        } catch (error) {
            logger.error(`Error in voiceStateUpdate for guild ${guildId}:`, error);
        }

        // ... (Keep the rest of your existing functions below unchanged: handleVoiceJoin, handleVoiceLeave, etc.)
