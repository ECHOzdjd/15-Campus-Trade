jest.mock('../../config/db', () => {
  const query = jest.fn()
  const getConnection = jest.fn()
  return { query, getConnection }
})

const pool = require('../../config/db')
const paymentModel = require('../../models/paymentModel')

function createConnection() {
  return {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
    query: jest.fn()
  }
}

describe('paymentModel', () => {
  beforeEach(() => {
    pool.query.mockClear()
    pool.getConnection.mockClear()
  })

  test('formatMoney rounds values and keeps the sign', () => {
    expect(paymentModel.formatMoney('12.345')).toBe(12.35)
    expect(paymentModel.formatMoney('-12.345')).toBe(-12.35)
    expect(paymentModel.formatMoney('10.074')).toBe(10.07)
  })

  test('assertSufficientBalance throws when the balance is too low', () => {
    expect(() => paymentModel.assertSufficientBalance(9.99, 10)).toThrow('INSUFFICIENT_BALANCE')
    expect(() => paymentModel.assertSufficientBalance(10, 10)).not.toThrow()
  })

  test('ensureWallet inserts a wallet row with the provided connection', async () => {
    const connection = createConnection()
    connection.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    await paymentModel.ensureWallet(7, connection)

    expect(connection.query).toHaveBeenCalledWith(
      'INSERT IGNORE INTO wallets (user_id, balance, frozen_balance) VALUES (?, 0.00, 0.00)',
      [7]
    )
  })

  test('getWallet initializes the wallet and returns balances plus transactions', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 20.5, frozen_balance: 1.25 }]])
      .mockResolvedValueOnce([[
        {
          id: 1,
          order_id: null,
          type: 'recharge',
          direction: 'in',
          amount: 20.5,
          balance_after: 20.5,
          note: 'top up',
          created_at: '2026-01-01'
        }
      ]])

    const result = await paymentModel.getWallet(3)

    expect(result).toEqual({
      balance: 20.5,
      frozenBalance: 1.25,
      transactions: [
        {
          id: 1,
          orderId: null,
          type: 'recharge',
          direction: 'in',
          amount: 20.5,
          balanceAfter: 20.5,
          note: 'top up',
          createdAt: '2026-01-01'
        }
      ]
    })
  })

  test('recharge uses the provided connection without opening a new one', async () => {
    const connection = createConnection()
    connection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 20, frozen_balance: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 35, frozen_balance: 0 }]])
      .mockResolvedValueOnce([[
        {
          id: 9,
          order_id: null,
          type: 'recharge',
          direction: 'in',
          amount: 15,
          balance_after: 35,
          note: 'recharge',
          created_at: '2026-01-01'
        }
      ]])

    const result = await paymentModel.recharge(7, 15, connection)

    expect(pool.getConnection).not.toHaveBeenCalled()
    expect(connection.beginTransaction).not.toHaveBeenCalled()
    expect(result.balance).toBe(35)
    expect(result.transactions[0].type).toBe('recharge')
  })

  test('recharge commits and releases a managed transaction when no connection is provided', async () => {
    const connection = createConnection()
    pool.getConnection.mockResolvedValueOnce(connection)

    connection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 20, frozen_balance: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 35, frozen_balance: 0 }]])
      .mockResolvedValueOnce([[
        {
          id: 10,
          order_id: null,
          type: 'recharge',
          direction: 'in',
          amount: 15,
          balance_after: 35,
          note: 'recharge',
          created_at: '2026-01-01'
        }
      ]])

    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 35, frozen_balance: 0 }]])
      .mockResolvedValueOnce([[
        {
          id: 11,
          order_id: null,
          type: 'recharge',
          direction: 'in',
          amount: 15,
          balance_after: 35,
          note: 'top up',
          created_at: '2026-01-01'
        }
      ]])

    const result = await paymentModel.recharge(7, 15)

    expect(pool.getConnection).toHaveBeenCalledTimes(1)
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1)
    expect(connection.commit).toHaveBeenCalledTimes(1)
    expect(connection.rollback).not.toHaveBeenCalled()
    expect(connection.release).toHaveBeenCalledTimes(1)
    expect(result.balance).toBe(35)
  })

  test('recharge rolls back when the managed transaction fails', async () => {
    const connection = createConnection()
    pool.getConnection.mockResolvedValueOnce(connection)

    connection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockRejectedValueOnce(new Error('lock failed'))

    await expect(paymentModel.recharge(7, 15)).rejects.toThrow('lock failed')

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1)
    expect(connection.rollback).toHaveBeenCalledTimes(1)
    expect(connection.release).toHaveBeenCalledTimes(1)
  })

  test('payToEscrow moves money into escrow for a funded buyer', async () => {
    const connection = createConnection()
    const order = {
      id: 8,
      buyer: { id: 10 },
      seller: { id: 20 },
      product: { price: '88.50' }
    }

    connection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ user_id: 10, balance: 100, frozen_balance: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])

    await paymentModel.payToEscrow(connection, order)

    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payment_escrows'),
      [8, 10, 20, 88.5]
    )
  })

  test('payToEscrow rejects buyers without enough balance', async () => {
    const connection = createConnection()
    const order = {
      id: 8,
      buyer: { id: 10 },
      seller: { id: 20 },
      product: { price: 88.5 }
    }

    connection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ user_id: 10, balance: 5, frozen_balance: 0 }]])

    await expect(paymentModel.payToEscrow(connection, order)).rejects.toThrow('INSUFFICIENT_BALANCE')
    expect(connection.query).toHaveBeenCalledTimes(2)
  })

  test('releaseEscrow releases funds to the seller', async () => {
    const connection = createConnection()
    const order = { id: 8, seller: { id: 20 } }

    connection.query
      .mockResolvedValueOnce([[{ id: 55, buyer_id: 10, seller_id: 20, amount: 44.5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ user_id: 20, balance: 10, frozen_balance: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])

    await paymentModel.releaseEscrow(connection, order)

    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE payment_escrows SET status = 'released'"),
      [55]
    )
  })

  test('refundEscrow returns money to the buyer', async () => {
    const connection = createConnection()
    const order = { id: 8, buyer: { id: 10 } }

    connection.query
      .mockResolvedValueOnce([[{ id: 66, buyer_id: 10, seller_id: 20, amount: 44.5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ user_id: 10, balance: 10, frozen_balance: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])

    await paymentModel.refundEscrow(connection, order)

    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE payment_escrows SET status = 'refunded'"),
      [66]
    )
  })
})
