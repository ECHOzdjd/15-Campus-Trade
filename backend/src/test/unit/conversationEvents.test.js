const conversationEvents = require('../../services/conversationEvents')

describe('conversationEvents', () => {
  test('notifyClients removes throwing responses and keeps healthy responses', () => {
    const throwingResponse = {
      destroyed: false,
      writableEnded: false,
      write: jest.fn(() => {
        throw new Error('closed')
      })
    }
    const healthyResponse = {
      destroyed: false,
      writableEnded: false,
      write: jest.fn()
    }

    conversationEvents.addClient(42, throwingResponse)
    conversationEvents.addClient(42, healthyResponse)

    expect(() => {
      conversationEvents.notifyClients(42, { id: 1, content: 'hello' })
    }).not.toThrow()

    expect(throwingResponse.write).toHaveBeenCalledTimes(1)
    expect(healthyResponse.write).toHaveBeenCalledWith('event: message\n')
    expect(healthyResponse.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ id: 1, content: 'hello' })}\n\n`
    )

    conversationEvents.notifyClients(42, { id: 2, content: 'again' })

    expect(throwingResponse.write).toHaveBeenCalledTimes(1)
    expect(healthyResponse.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ id: 2, content: 'again' })}\n\n`
    )

    conversationEvents.removeClient(42, healthyResponse)
  })
})
