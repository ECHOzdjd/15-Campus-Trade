const paymentModel = require('../../models/paymentModel')

describe('paymentModel', () => {
  test('formatMoney normalizes decimal values', () => {
    expect(paymentModel.formatMoney('12.345')).toBe(12.35)
    expect(paymentModel.formatMoney(12)).toBe(12)
  })

  test('formatMoney rounds decimal ties without binary float drift', () => {
    expect(paymentModel.formatMoney('10.075')).toBe(10.08)
  })

  test('assertSufficientBalance throws when balance is too low', () => {
    expect(() => paymentModel.assertSufficientBalance(9.99, 10)).toThrow('INSUFFICIENT_BALANCE')
  })

  test('assertSufficientBalance allows exact balance', () => {
    expect(() => paymentModel.assertSufficientBalance(10, 10)).not.toThrow()
  })
})
