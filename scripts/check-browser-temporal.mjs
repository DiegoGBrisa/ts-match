import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright'

const browserTypes = { chromium, firefox, webkit }
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = resolve(root, 'dist')

function hasArg(name) {
  return process.argv.includes(name)
}

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function parseBrowsers() {
  const browserArgument = readArg('--browser') ?? process.env.TS_MATCH_BROWSER ?? 'chromium'
  return browserArgument
    .split(',')
    .map((browser) => browser.trim())
    .filter(Boolean)
}

function contentType(pathname) {
  if (extname(pathname) === '.js') return 'text/javascript'
  if (extname(pathname) === '.map') return 'application/json'
  return 'application/octet-stream'
}

async function createStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
      const requestedPath = resolve(root, `.${decodeURIComponent(requestUrl.pathname)}`)

      if (requestedPath !== distRoot && !requestedPath.startsWith(`${distRoot}${sep}`)) {
        response.writeHead(404)
        response.end('Not found')
        return
      }

      const file = await stat(requestedPath)
      if (!file.isFile()) {
        response.writeHead(404)
        response.end('Not found')
        return
      }

      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType(requestedPath),
      })
      createReadStream(requestedPath).pipe(response)
    } catch (error) {
      response.writeHead(500)
      response.end(error instanceof Error ? error.message : String(error))
    }
  })

  await new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', resolveServer)
  })

  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Unable to start local test server.')

  return {
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error)
          else resolveClose()
        })
      }),
    origin: `http://127.0.0.1:${String(address.port)}`,
  }
}

async function runBrowser(browserName, moduleUrl, expectTemporal) {
  const browserType = browserTypes[browserName]
  if (browserType === undefined) throw new Error(`Unsupported browser: ${browserName}`)

  const browser = await browserType.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const result = await page.evaluate(async (sourceUrl) => {
      const { isMatching, match, P } = await import(sourceUrl)
      const temporalAvailable = typeof Temporal !== 'undefined'

      function assert(condition, message) {
        if (!condition) throw new Error(message)
      }

      if (!temporalAvailable) {
        assert(!isMatching(P.temporalInstant, {}), 'P.temporalInstant should not match without Temporal')
        assert(
          !isMatching(P.temporalPlainDate, { [Symbol.toStringTag]: 'Temporal.PlainDate' }),
          'P.temporalPlainDate should reject spoofed values without Temporal',
        )
        assert(!isMatching(P.temporal, new Date('2026-06-03T00:00:00.000Z')), 'P.temporal should reject Date')
        assert(
          match({})
            .with(P.temporal, () => 'temporal')
            .otherwise(() => 'fallback') === 'fallback',
          'match should fall back without Temporal',
        )

        return {
          temporalAvailable,
          userAgent: navigator.userAgent,
        }
      }

      const instant = Temporal.Instant.from('2026-06-03T00:00:00Z')
      const plainDate = Temporal.PlainDate.from('2026-06-03')
      const plainTime = Temporal.PlainTime.from('12:34:56')
      const plainDateTime = Temporal.PlainDateTime.from('2026-06-03T12:34:56')
      const zonedDateTime = Temporal.ZonedDateTime.from('2026-06-03T12:34:56+00:00[UTC]')
      const duration = Temporal.Duration.from('P1DT2H')
      const plainYearMonth = Temporal.PlainYearMonth.from('2026-06')
      const plainMonthDay = Temporal.PlainMonthDay.from('--06-03')

      assert(isMatching(P.temporalInstant, instant), 'P.temporalInstant should match Temporal.Instant')
      assert(isMatching(P.temporalPlainDate, plainDate), 'P.temporalPlainDate should match Temporal.PlainDate')
      assert(isMatching(P.temporalPlainTime, plainTime), 'P.temporalPlainTime should match Temporal.PlainTime')
      assert(
        isMatching(P.temporalPlainDateTime, plainDateTime),
        'P.temporalPlainDateTime should match Temporal.PlainDateTime',
      )
      assert(
        isMatching(P.temporalZonedDateTime, zonedDateTime),
        'P.temporalZonedDateTime should match Temporal.ZonedDateTime',
      )
      assert(isMatching(P.temporalDuration, duration), 'P.temporalDuration should match Temporal.Duration')
      assert(
        isMatching(P.temporalPlainYearMonth, plainYearMonth),
        'P.temporalPlainYearMonth should match Temporal.PlainYearMonth',
      )
      assert(
        isMatching(P.temporalPlainMonthDay, plainMonthDay),
        'P.temporalPlainMonthDay should match Temporal.PlainMonthDay',
      )

      assert(isMatching(P.temporal, instant), 'P.temporal should match Temporal.Instant')
      assert(isMatching(P.temporal, plainDate), 'P.temporal should match Temporal.PlainDate')
      assert(isMatching(P.temporal, plainTime), 'P.temporal should match Temporal.PlainTime')
      assert(isMatching(P.temporal, plainDateTime), 'P.temporal should match Temporal.PlainDateTime')
      assert(isMatching(P.temporal, zonedDateTime), 'P.temporal should match Temporal.ZonedDateTime')
      assert(isMatching(P.temporal, duration), 'P.temporal should match Temporal.Duration')
      assert(isMatching(P.temporal, plainYearMonth), 'P.temporal should match Temporal.PlainYearMonth')
      assert(isMatching(P.temporal, plainMonthDay), 'P.temporal should match Temporal.PlainMonthDay')

      assert(!isMatching(P.temporalPlainDate, instant), 'P.temporalPlainDate should reject Temporal.Instant')
      assert(!isMatching(P.temporalInstant, plainDate), 'P.temporalInstant should reject Temporal.PlainDate')
      assert(!isMatching(P.temporal, new Date('2026-06-03T00:00:00.000Z')), 'P.temporal should reject Date')
      assert(
        !isMatching(P.temporalPlainDate, { [Symbol.toStringTag]: 'Temporal.PlainDate' }),
        'P.temporalPlainDate should reject spoofed values',
      )
      assert(
        match(plainDate)
          .with(P.temporalInstant, () => 'instant')
          .with(P.temporalPlainDate, () => 'plain-date')
          .otherwise(() => 'other') === 'plain-date',
        'match should dispatch Temporal.PlainDate',
      )

      return {
        temporalAvailable,
        userAgent: navigator.userAgent,
      }
    }, moduleUrl)

    if (expectTemporal && !result.temporalAvailable) {
      throw new Error(`${browserName} did not provide globalThis.Temporal. User agent: ${result.userAgent}`)
    }

    console.log(
      `${browserName}: ${result.temporalAvailable ? 'native Temporal' : 'no Temporal fallback'} integration ok`,
    )
  } finally {
    await browser.close()
  }
}

const browsers = parseBrowsers()
const expectTemporal = hasArg('--expect-temporal') || process.env.TS_MATCH_EXPECT_BROWSER_TEMPORAL === '1'

const server = await createStaticServer()
try {
  const moduleUrl = `${server.origin}/dist/index.js`
  for (const browserName of browsers) {
    await runBrowser(browserName, moduleUrl, expectTemporal)
  }
} finally {
  await server.close()
}
