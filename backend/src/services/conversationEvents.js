const clients = new Map()

function addClient(conversationId, res) {
  const key = String(conversationId)
  if (!clients.has(key)) {
    clients.set(key, new Set())
  }
  clients.get(key).add(res)
}

function removeClient(conversationId, res) {
  const key = String(conversationId)
  const set = clients.get(key)
  if (!set) return

  set.delete(res)
  if (set.size === 0) {
    clients.delete(key)
  }
}

function notifyClients(conversationId, payload) {
  const set = clients.get(String(conversationId))
  if (!set) return

  set.forEach((res) => {
    if (res.destroyed || res.writableEnded) {
      removeClient(conversationId, res)
      return
    }

    try {
      res.write('event: message\n')
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    } catch {
      removeClient(conversationId, res)
    }
  })
}

module.exports = { addClient, removeClient, notifyClients }
