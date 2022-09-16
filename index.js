const Discord = require('discord.js'),
    Enmap = require('enmap')
const fs = require('fs');
//const config = require('./config.json');
const webhook = require('./webhook/webhook');
//const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] })
//client.commands = new Discord.Collection();

const db_create = require('./database/createDB');
db_create.create();
const sqlite3 = require("sqlite3");
const database_filepath = "./database/users.db";
const db = new sqlite3.Database(database_filepath);

const client = new Discord.Client(),
    {
        readdirSync
    } = require('fs'),
    commandFiles = readdirSync('./commands').filter(c => c.endsWith('.js')),
    config = require('./config.json')

client.vouches = new Enmap({
    name: "vouches",
    autoFetch: true,
    fetchAll: true,
    ensureProps: true
})

client.commands = new Discord.Collection()

for (let file of commandFiles) {
    let command = require(`./commands/${file}`)
    client.commands.set(command.name, command)
}

client.on('ready', () => {
    console.clear()
    console.log(`${client.user.tag} is online!`)
})

client.on('message', async message => {
    let user = (user) => {
        return client.vouches.ensure(user.id, {
            upvotes: [

            ],
            downvotes: [

            ],
            vouchedFor: [],
            downvotedFor: []
        })
    }
    let a = user(message.author)
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    let args = message.content.trim().slice(config.prefix.length).split(/\s+/g)
    let commandName = args.shift().toLowerCase()

    let command = client.commands.get(commandName) || client.commands.find(c => c.aliases && c.aliases.includes(commandName))
    if (!command) return;

    try {
        await command.execute(message, args, client, user)
    } catch (e) {
        console.log(e)
    }

})

function ImportCommands() {
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		client.commands.set(command.name, command);
	}
	const webhookFiles = fs.readdirSync('./embeds/Webhooks').filter(file => file.endsWith('.js'));
	for (const file of webhookFiles) {
		const command = require(`./embeds/Webhooks/${file}`);
		client.commands.set(command.name, command);
	}
}

function VerifyConfig() {
	if (!config) throw Error('Config file not found');
	if (!config.token) throw Error('Bot token not found');
	if (!config.sellix_auth) throw Error('Sellix token not found');
	if (!config.prefix) config.prefix = '!';
}

/*client.once('ready', () => {
	VerifyConfig();
	ImportCommands();
	console.log(`Logged in as ${client.user.tag}`);
});*/

webhook.event.on('event',function(event_name, event_data){
	const command = client.commands.get(event_name);
	if(!command)return;
	var embed = command.execute(event_data);
	const channel = client.channels.cache.get(command.channel);
	if(embed)channel.send(embed);
})

client.on('message', async message => {
	const prefix = config.prefix;
	if (!message.content.startsWith(prefix))return;
	if (message.author === client.user || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName);
	if (!webhook) return;
	if (!command) return;

	if (message.channel.type === "dm") {
		return message.reply('Command not available in DMs');
	}

	if (command.adminOnly) {
		const adminArray = config.admins;
		if (!adminArray.includes(message.author.id))
			return message.reply('You don\'t have the permission to execute this command.');
	}

	try {
		await command.execute(message, args,db);
	}
	catch (error) {
		console.error(error);
		message.reply(`error trying to execute that command ${message.author}`);
	}

});

client.login(config.token)