import { describe, expect, it } from 'vitest'
import { isMatching, match, P } from '../../src/index.js'

const temporalAvailable = typeof Temporal !== 'undefined'
const expectRealTemporal = process.env.TS_MATCH_EXPECT_REAL_TEMPORAL === '1'

if (!temporalAvailable && expectRealTemporal) {
  throw new Error('Expected real Temporal support, but this runtime does not provide globalThis.Temporal.')
}

describe('Temporal runtime integration', () => {
  it('matches real Temporal API values when the current runtime provides Temporal', () => {
    if (!temporalAvailable) return

    const instant = Temporal.Instant.from('2026-06-03T00:00:00Z')
    const plainDate = Temporal.PlainDate.from('2026-06-03')
    const plainTime = Temporal.PlainTime.from('12:34:56')
    const plainDateTime = Temporal.PlainDateTime.from('2026-06-03T12:34:56')
    const zonedDateTime = Temporal.ZonedDateTime.from('2026-06-03T12:34:56+00:00[UTC]')
    const duration = Temporal.Duration.from('P1DT2H')
    const plainYearMonth = Temporal.PlainYearMonth.from('2026-06')
    const plainMonthDay = Temporal.PlainMonthDay.from('--06-03')

    expect(isMatching(P.temporalInstant, instant)).toBe(true)
    expect(isMatching(P.temporalPlainDate, plainDate)).toBe(true)
    expect(isMatching(P.temporalPlainTime, plainTime)).toBe(true)
    expect(isMatching(P.temporalPlainDateTime, plainDateTime)).toBe(true)
    expect(isMatching(P.temporalZonedDateTime, zonedDateTime)).toBe(true)
    expect(isMatching(P.temporalDuration, duration)).toBe(true)
    expect(isMatching(P.temporalPlainYearMonth, plainYearMonth)).toBe(true)
    expect(isMatching(P.temporalPlainMonthDay, plainMonthDay)).toBe(true)

    expect(isMatching(P.temporal, instant)).toBe(true)
    expect(isMatching(P.temporal, plainDate)).toBe(true)
    expect(isMatching(P.temporal, plainTime)).toBe(true)
    expect(isMatching(P.temporal, plainDateTime)).toBe(true)
    expect(isMatching(P.temporal, zonedDateTime)).toBe(true)
    expect(isMatching(P.temporal, duration)).toBe(true)
    expect(isMatching(P.temporal, plainYearMonth)).toBe(true)
    expect(isMatching(P.temporal, plainMonthDay)).toBe(true)

    expect(isMatching(P.temporalPlainDate, instant)).toBe(false)
    expect(isMatching(P.temporalPlainTime, plainDate)).toBe(false)
    expect(isMatching(P.temporalPlainDateTime, plainTime)).toBe(false)
    expect(isMatching(P.temporalZonedDateTime, plainDateTime)).toBe(false)
    expect(isMatching(P.temporalDuration, zonedDateTime)).toBe(false)
    expect(isMatching(P.temporalPlainYearMonth, duration)).toBe(false)
    expect(isMatching(P.temporalPlainMonthDay, plainYearMonth)).toBe(false)
    expect(isMatching(P.temporalInstant, plainMonthDay)).toBe(false)

    expect(isMatching(P.date, instant)).toBe(false)
    expect(isMatching(P.date, plainDate)).toBe(false)
    expect(isMatching(P.temporal, new Date('2026-06-03T00:00:00.000Z'))).toBe(false)
    expect(isMatching(P.temporalPlainDate, { [Symbol.toStringTag]: 'Temporal.PlainDate' })).toBe(false)

    expect(
      match(plainDate)
        .with(P.temporalInstant, () => 'instant')
        .with(P.temporalPlainDate, () => 'plain-date')
        .otherwise(() => 'other'),
    ).toBe('plain-date')
  })

  it('matches nothing and does not throw when the current runtime has no Temporal', () => {
    if (temporalAvailable) return

    expect(() => isMatching(P.temporalInstant, {})).not.toThrow()
    expect(() => isMatching(P.temporalPlainDate, {})).not.toThrow()
    expect(() => isMatching(P.temporalPlainTime, {})).not.toThrow()
    expect(() => isMatching(P.temporalPlainDateTime, {})).not.toThrow()
    expect(() => isMatching(P.temporalZonedDateTime, {})).not.toThrow()
    expect(() => isMatching(P.temporalDuration, {})).not.toThrow()
    expect(() => isMatching(P.temporalPlainYearMonth, {})).not.toThrow()
    expect(() => isMatching(P.temporalPlainMonthDay, {})).not.toThrow()
    expect(() => isMatching(P.temporal, new Date('2026-06-03T00:00:00.000Z'))).not.toThrow()

    expect(isMatching(P.temporalInstant, {})).toBe(false)
    expect(isMatching(P.temporalPlainDate, { [Symbol.toStringTag]: 'Temporal.PlainDate' })).toBe(false)
    expect(isMatching(P.temporalPlainTime, { [Symbol.toStringTag]: 'Temporal.PlainTime' })).toBe(false)
    expect(isMatching(P.temporalPlainDateTime, { [Symbol.toStringTag]: 'Temporal.PlainDateTime' })).toBe(false)
    expect(isMatching(P.temporalZonedDateTime, { [Symbol.toStringTag]: 'Temporal.ZonedDateTime' })).toBe(false)
    expect(isMatching(P.temporalDuration, { [Symbol.toStringTag]: 'Temporal.Duration' })).toBe(false)
    expect(isMatching(P.temporalPlainYearMonth, { [Symbol.toStringTag]: 'Temporal.PlainYearMonth' })).toBe(false)
    expect(isMatching(P.temporalPlainMonthDay, { [Symbol.toStringTag]: 'Temporal.PlainMonthDay' })).toBe(false)
    expect(isMatching(P.temporal, new Date('2026-06-03T00:00:00.000Z'))).toBe(false)

    const value = {}
    expect(
      match(value)
        .with(P.temporal, () => 'temporal')
        .otherwise(() => 'fallback'),
    ).toBe('fallback')
  })
})
