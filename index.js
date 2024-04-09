import emlParser from 'eml-parser';
import TurndownService from 'turndown';
import discord from 'discord.js'
import 'dotenv/config';

import fs from 'fs'
import path from 'path';
import { promisify } from 'util';

const turndownService = new TurndownService({ strongDelimiter: '*' })
const writeFile = promisify(fs.writeFile)

const convertFiles = async () => {
    const emlsFiles = fs.readdirSync('./eml')

    for (const filename of emlsFiles) {
        const emailFile = fs.createReadStream(path.join('./eml', filename))
        const parsedEmail = await new emlParser(emailFile).getEmailBodyHtml()

        const markdown = turndownService.turndown(parsedEmail)
        const outputPath = path.join('./markdown', `${filename.replace(/\.[^/.]+$/, '')}.txt`)
        await writeFile(outputPath, markdown)
    }

    console.log(`Arquivos convertidos:\n${emlsFiles.join(', ')}`)
}

const sendMessages = async () => {
    const client = new discord.Client({
        intents: [
            discord.GatewayIntentBits.Guilds,
        ]
    })

    client.login(process.env.BOT_TOKEN)

    client.once('ready', async () => {
        const channel = client.channels.cache.get(process.env.WARN_CHANNEL_ID)

        const markdownFiles = fs.readdirSync('./markdown')

        // Use Promise.all to wait for all messages to be sent
        const promises = markdownFiles.map(async filename => {
            const data = fs.readFileSync(`./markdown/${filename}`, 'utf8')

            const emailEmbed = new discord.EmbedBuilder()
                .setColor(3976703)
                .setDescription(data)

            const warnEmbed = new discord.EmbedBuilder()
                .setColor(15204352)
                .setDescription('### Atenção\nMensagem enviada no e-mail institucional. Para acessar os links anexados, confira a sua própria caixa de entrada.')

            await channel.send({ content: 'everyone', embeds: [emailEmbed, warnEmbed] })
            console.log("Mensagem enviada")
        })

        // Wait for all promises to resolve
        await Promise.all(promises)

        // Logout and destroy the client
        client.destroy()

        // Exit the process
        process.exit(0)
    })
}

switch (process.argv[2]) {
    case 'convert':
        convertFiles()
        break
    case 'send':
        sendMessages()
        break
    default:
        console.log('Só aceito "convert" e "send"')
}