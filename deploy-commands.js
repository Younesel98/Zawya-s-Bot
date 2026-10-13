import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const commandsPath = path.join(__dirname, 'commands'); // Adjust folder name if needed

// Helper function to read commands recursively from subfolders
async function loadCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await loadCommands(filePath);
        } else if (file.name.endsWith('.js')) {
            const command = await import(`file://${filePath}`);
            const cmdData = command.default || command;
            if ('data' in cmdData && 'execute' in cmdData) {
                commands.push(cmdData.data.toJSON());
            }
        }
    }
}

(async () => {
    try {
        if (!fs.existsSync(commandsPath)) {
            console.error(`❌ Folder not found at: ${commandsPath}`);
            return;
        }

        await loadCommands(commandsPath);
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded application (/) commands for your guild!`);
    } catch (error) {
        console.error(error);
    }
})();
