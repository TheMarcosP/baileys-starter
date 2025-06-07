import { Router } from 'express'
import { getSocket } from '../socket/manager.js'

import authRouter from './auth.js'
import dashboardRouter from './dashboard.js'
import qrRouter from './qr.js'

const router = Router()

router.use(authRouter)
router.use(dashboardRouter)
router.use(qrRouter)

// API endpoint to send WhatsApp messages from FastAPI
router.post('/api/send-message', async (req, res) => {
    const { jid, text } = req.body
    const sock = getSocket()
    if (!sock) {
        return res.status(503).json({ error: 'WhatsApp socket not connected' })
    }
    if (!jid || !text) {
        return res.status(400).json({ error: 'jid and text are required' })
    }
    try {
        await sock.sendMessage(jid, { text })
        return res.json({ status: 'sent' })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
})

export default router
