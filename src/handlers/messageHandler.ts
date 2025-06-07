import { BaileysEventMap, WASocket, WAMessage, downloadMediaMessage, getContentType } from 'baileys'
import axios from 'axios'
import fs from 'fs'
import path from 'path'

import { config } from '../config/index.js'
import { generateResponse } from '../ai/openai.js'
import { createLogger } from '../logger/index.js'

const logger = createLogger('MessageHandler')

export function setupMessageHandler(sock: WASocket) {
    // Handle incoming messages
    sock.ev.on(
        'messages.upsert',
        async ({ messages, type }: BaileysEventMap['messages.upsert']) => {
            // Only process new messages
            if (type !== 'notify') return

            for (const message of messages) {
                // Skip if no message content
                if (!message.message) continue

                // Skip messages from self
                if (message.key.fromMe) continue

                await handleMessage(sock, message)
            }
        }
    )
}

async function handleMessage(sock: WASocket, message: WAMessage) {
    try {
        const remoteJid = message.key.remoteJid
        if (!remoteJid) return

        // Detect message type
        const messageType = message.message ? getContentType(message.message) : undefined

        if (messageType === 'imageMessage') {
            // Ensure receipts directory exists
            const receiptsDir = path.join(process.cwd(), 'receipts')
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir)
            }
            // Download image
            const stream = await downloadMediaMessage(
                message,
                'stream',
                {},
                { logger: logger.getPinoInstance(), reuploadRequest: sock.updateMediaMessage }
            )
            const fileName = `receipt_${message.key.id}.jpg`
            const filePath = path.join(receiptsDir, fileName)
            const writeStream = fs.createWriteStream(filePath)
            await new Promise((resolve, reject) => {
                stream.pipe(writeStream)
                stream.on('end', resolve)
                stream.on('error', reject)
            })
            // Notify FastAPI
            try {
                await axios.post('http://localhost:8000/whatsapp/message', {
                    remoteJid,
                    messageId: message.key.id,
                    imagePath: filePath,
                    fullMessage: message
                })
            } catch (err) {
                logger.error('Failed to notify FastAPI about image', err)
            }
            logger.info('Image message received and saved', {
                from: remoteJid,
                messageId: message.key.id,
                filePath
            })
            return
        }

        // Handle PDF document receipts
        if (messageType === 'documentMessage' && message.message?.documentMessage?.mimetype === 'application/pdf') {
            const receiptsDir = path.join(process.cwd(), 'receipts')
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir)
            }
            // Download PDF
            const stream = await downloadMediaMessage(
                message,
                'stream',
                {},
                { logger: logger.getPinoInstance(), reuploadRequest: sock.updateMediaMessage }
            )
            const fileName = `receipt_${message.key.id}.pdf`
            const filePath = path.join(receiptsDir, fileName)
            const writeStream = fs.createWriteStream(filePath)
            await new Promise((resolve, reject) => {
                stream.pipe(writeStream)
                stream.on('end', resolve)
                stream.on('error', reject)
            })
            // Notify FastAPI
            try {
                await axios.post('http://localhost:8000/whatsapp/message', {
                    remoteJid,
                    messageId: message.key.id,
                    pdfPath: filePath,
                    fullMessage: message
                })
            } catch (err) {
                logger.error('Failed to notify FastAPI about PDF', err)
            }
            logger.info('PDF receipt received and saved', {
                from: remoteJid,
                messageId: message.key.id,
                filePath
            })
            return
        }

        // Get the text content from the message
        const textContent =
            message.message?.conversation || message.message?.extendedTextMessage?.text || ''

        if (!textContent) return

        // Send message to FastAPI
        try {
            await axios.post('http://localhost:8000/whatsapp/message', {
                remoteJid,
                text: textContent,
                messageId: message.key.id,
                fullMessage: message
            })
        } catch (err) {
            logger.error('Failed to forward message to FastAPI', err)
        }

        logger.info('Message received', {
            from: remoteJid,
            text: textContent,
            messageId: message.key.id
        })

        // If AI is enabled, use AI for all messages
        if (config.bot.aiEnabled) {
            logger.info('Processing AI request', { prompt: textContent, from: remoteJid })

            try {
                const aiReply = await generateResponse(textContent)
                await sock.sendMessage(remoteJid, { text: aiReply })
                logger.info('AI response sent', { to: remoteJid, responseLength: aiReply.length })
            } catch (error) {
                logger.error('AI request failed', error)
                await sock.sendMessage(remoteJid, {
                    text: 'Sorry, AI is currently unavailable. Please try again later.'
                })
            }
            return
        }

        // Fallback to echo if AI is disabled
        await sock.sendMessage(remoteJid, {
            text: `Echo: ${textContent}`
        })

        logger.info('Echo response sent', {
            to: remoteJid,
            originalText: textContent
        })
    } catch (error) {
        logger.error('Error handling message', error, {
            messageId: message.key.id,
            from: message.key.remoteJid
        })
    }
}
