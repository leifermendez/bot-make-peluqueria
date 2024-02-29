import { addKeyword, EVENTS } from "@bot-whatsapp/bot";
import { generateTimer } from "../utils/generateTimer";
import { getHistoryParse, handleHistory } from "../utils/handleHistory";
import AIClass from "../services/ai";
import { getFullCurrentDate } from "src/utils/currentDate";
import { query } from "src/stack";

export const generatePromptSeller = (history: string, prompt: string) => {
    const nowDate = getFullCurrentDate()
    return prompt.replace('{HISTORY}', history).replace('{CURRENT_DAY}', nowDate)
};

/**
 * Hablamos con el PROMPT que sabe sobre las cosas basicas del negocio, info, precio, etc.
 */
const flowSeller = addKeyword(EVENTS.ACTION).addAction(async (_, { state, flowDynamic, extensions, globalState }) => {
    try {

        const ai = extensions.ai as AIClass
        const prompts = extensions.prompts
        const history = getHistoryParse(state)
        const dataDb = await query({ "in-0": history })
        const prompt = generatePromptSeller(history, prompts.hablar).replace('{DATABASE}', dataDb)
        console.log({ prompt })

        const text = await ai.createChat([
            {
                role: 'system',
                content: prompt
            }
        ])

        await handleHistory({ content: text, role: 'assistant' }, state)

        const chunks = text.split(/(?<!\d)\.\s+/g);
        for (const chunk of chunks) {
            await flowDynamic([{ body: chunk.trim(), delay: generateTimer(150, 250) }]);
        }
    } catch (err) {
        console.log(`[ERROR]:`, err)
        return
    }
})

export { flowSeller }