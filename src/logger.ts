import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

function createLogger() {
  const level = process.env.LOG_LEVEL || (isTest ? 'silent' : 'info')

  if (isProduction) {
    return pino({ level })
  }

  try {
    return pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    })
  } catch {
    return pino({ level })
  }
}

const logger = createLogger()

export default logger
