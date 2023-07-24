require('dotenv').config();
const { REST } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botToken = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [];
const commandFolders = fs.readdirSync('./commands');

for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(path.join('./commands', folder)).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${folder}/${file}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command file '${file}' is missing a required "data" or "execute" property.`);
    }
  }
}

const rest = new REST({ version: '9' }).setToken(botToken);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      `/applications/${clientId}/commands`, // Use template literals to include the correct client ID
      { body: commands },
      {defaultPermission: true},
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
})();
