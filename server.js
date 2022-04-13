const request = require('request')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

app.use(express.static('dist', { index: 'demo.html', maxage: '4h' }))
app.use(bodyParser.json())

const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, PORT } = process.env

const sessions = {}
const buffer = {}

const sendTelegramMessage = (chatId, text, parseMode, disableNotification = false) => {
  const data = {
    disable_notification: disableNotification,
    chat_id: chatId,
    text,
  }
  if (parseMode) data.parse_mode = parseMode

  request
    .post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`)
    .form(data)
    .on('error', console.error)
}

// Handle admin Telegram messages
app.post('/hook', (req, res) => {
  try {
    const message = req.body.message || req.body.channel_post
    let name = 'Andrii' // message.from.first_name || message.chat.first_name
    const text = message.text || ''
    const reply = message.reply_to_message

    if (text.startsWith('/start')) { // init
      sendTelegramMessage(
        TELEGRAM_CHAT_ID,
        '*Welcome to Intergram* \n' +
          'Your unique chat id is `' +
          TELEGRAM_CHAT_ID +
          '`\n' +
          'Use it to link between the embedded chat and this telegram chat',
        'Markdown'
      )
    } else if (reply) { // reply to a specific user
      let replyText = reply.text || ''
      let userId = replyText.split(':')[0]
      const socketId = sessions[userId]

      if (socketId) {
        io.to(socketId).emit(TELEGRAM_CHAT_ID + '-' + userId, {
          name,
          text,
          from: 'admin',
        })
      } else {
        if (!buffer[userId]) {
          buffer[userId] = []
        }

        buffer[userId].unshift({
          TELEGRAM_CHAT_ID,
          name,
          text,
          from: 'admin',
          adminName: name,
        })
      }
    } else if (text) { // broadcast message to all users
      // io.emit(chatId, {name, text, from: 'admin'})
    }
  } catch (e) {
    console.error('hook error', e, req.body)
  }
  res.statusCode = 200
  res.end()
})

// Handle chat visitors websocket messages
io.on('connection', (socket) => {
  socket.on('register', (registerMsg) => {
    let userId = registerMsg.userId
    let chatId = registerMsg.chatId

    sessions[userId] = socket.id

    if (buffer[userId]) {
      const buffered = buffer[userId]
      let msg = buffered.pop()
      while (msg) {
        const { chatId, name, text, from, adminName } = msg
        io.to(socket.id).emit(chatId + '-' + userId, {
          name,
          text,
          from,
          adminName,
        })
        msg = buffered.pop()
      }
      delete buffer[userId]
    }

    socket.on('message', (msg) => {
      if (msg.from !== 'bot') io.to(socket.id).emit(chatId + '-' + userId, msg)
      sendTelegramMessage(chatId, `${userId}: ${msg.text}`)
    })

    socket.on('disconnect', () => {
      delete sessions[userId]
    })
  })
})

http.listen(PORT || 3002, () => {
  console.log(`Chat listening on port: ${PORT || 3002}`)
})
