import 'dotenv/config'
import { createBot, MemoryDB, createProvider } from '@bot-whatsapp/bot'
import { BaileysProvider, handleCtx } from '@bot-whatsapp/provider-baileys'

import AIClass from './services/ai';
import flow from './flows';
import { getInitSettings } from './make';

const ai = new AIClass(process.env.OPEN_API_KEY, 'gpt-3.5-turbo-16k')
const PORT = process.env.PORT ?? 3001

const main = async (prompts: string) => {
    const provider = createProvider(BaileysProvider)

    await createBot({
        database: new MemoryDB(),
        provider,
        flow,
    }, { extensions: { ai, prompts } })

    provider.initHttpServer(+PORT)

    provider.http.server.post('/message', handleCtx(async (bot, req, res) => {
        const body = req.body
        const number = body.number
        const message = body.message
        await bot.sendMessage(number, message, {})
        return res.end('send')
    }))

    console.log(`Listo para enviar`)

}

getInitSettings().then(main)

