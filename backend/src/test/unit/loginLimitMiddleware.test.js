const loginLimitMiddleware = require('../../middlewares/loginLimitMiddleware')

function createRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('loginLimitMiddleware', () => {
  let now

  beforeEach(() => {
    now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('attaches helpers and locks an IP after repeated failures', () => {
    const req = { ip: '10.0.0.1' }
    const res = createRes()
    const next = jest.fn()

    loginLimitMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(typeof res.recordLoginFailure).toBe('function')
    expect(typeof res.clearLoginAttempts).toBe('function')

    for (let attempt = 0; attempt < 5; attempt += 1) {
      res.recordLoginFailure()
    }

    const lockedRes = createRes()
    loginLimitMiddleware(req, lockedRes, jest.fn())

    expect(lockedRes.status).toHaveBeenCalledWith(429)
    expect(lockedRes.json.mock.calls.at(-1)[0]).toMatchObject({
      code: 429,
      data: null,
    })
  })

  test('resets a stale lock once the attempt window expires', () => {
    const req = { connection: { remoteAddress: '10.0.0.2' } }
    const res = createRes()
    const next = jest.fn()

    loginLimitMiddleware(req, res, next)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      res.recordLoginFailure()
    }

    now += 5 * 60 * 1000 + 1
    const freshRes = createRes()
    loginLimitMiddleware(req, freshRes, next)

    expect(next).toHaveBeenCalled()
    expect(freshRes.status).not.toHaveBeenCalled()
    expect(typeof freshRes.recordLoginFailure).toBe('function')
  })
})
