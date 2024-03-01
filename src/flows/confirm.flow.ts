import { addKeyword, EVENTS } from "@bot-whatsapp/bot";
import AIClass from "../services/ai";
import { clearHistory, handleHistory, getHistoryParse } from "../utils/handleHistory";
import { getFullCurrentDate } from "../utils/currentDate";
import { appToCalendar } from "src/services/calendar";

const generatePromptToFormatDate = (history: string) => {
    const prompt = `Fecha de Hoy:${getFullCurrentDate()}, Basado en el Historial de conversacion: 
    ${history}
    ----------------
    Fecha ideal:...dd / mm hh:mm`

    return prompt
}

const generateJsonParse = (info: string) => {
    const prompt = `Como experto en la creación de prompts, tu principal tarea es analizar la información proporcionada en el contexto y generar un objeto JSON. Es crucial que este objeto se adhiera estrictamente a la estructura especificada a continuación. Asegúrate de que todos los campos estén presentes y que la información proporcionada cumpla con el formato establecido.
    Contexto: "${info}"
    Ejemplo de objeto JSON:
    
        {
            "name": "Leifer",
            "email": "fef@fef.com",
            "startDate": "2024/02/15 00:00:00" 
        }
    
    Nota: Para el campo "startDate", asegúrate de proporcionar la fecha en el formato exacto mostrado ("YYYY/MM/DD HH:MM:SS").
    Objeto JSON a generar:`

    return prompt
}

/**
 * Encargado de pedir los datos necesarios para registrar el evento en el calendario
 */
const flowConfirm = addKeyword(EVENTS.ACTION).addAction(async (_, { flowDynamic }) => {
    await flowDynamic('Ok, voy a pedirte unos datos para agendar')
    await flowDynamic('¿Cual es tu nombre?')
}).addAction({ capture: true }, async (ctx, { state, flowDynamic, extensions }) => {
    await state.update({ name: ctx.body })
    const ai = extensions.ai as AIClass

    const history = getHistoryParse(state)
    const text = await ai.createChat([
        {
            role: 'system',
            content: generatePromptToFormatDate(history)
        }
    ], 'gpt-4')

    await handleHistory({ content: text, role: 'assistant' }, state)
    await flowDynamic(`¿Me confirmas fecha y hora?: ${text}. **cancelar** para iniciar de nuevo`)
    await state.update({ startDate: text })
})
    .addAction({ capture: true }, async (ctx, { state, flowDynamic, endFlow }) => {
        if (ctx.body.toLocaleLowerCase().includes('cancelar')) {
            clearHistory(state)
            return endFlow()

        }
        await flowDynamic(`Ultima pregunta ¿Cual es tu email?`)
    })
    .addAction({ capture: true }, async (ctx, { state, extensions, flowDynamic, fallBack }) => {

        if (!ctx.body.includes('@')) {
            return fallBack(`Debes ingresar un mail correcto`)
        }

        const infoCustomer = `Name: ${state.get('name')}, StarteDate: ${state.get('startDate')}, email: ${ctx.body}`
        const ai = extensions.ai as AIClass

        const text = await ai.createChat([
            {
                role: 'system',
                content: generateJsonParse(infoCustomer)
            }
        ])

        await appToCalendar(text, ctx.from)
        clearHistory(state)
        await flowDynamic('Listo! agendado Buen dia')
    })

export { flowConfirm }