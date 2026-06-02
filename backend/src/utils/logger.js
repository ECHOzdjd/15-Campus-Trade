const levels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100
}

function getConfiguredLevel() {
  const configured = (process.env.LOG_LEVEL || 'info').toLowerCase()
  return levels[configured] === undefined ? 'info' : configured
}

function shouldLog(level) {
  const configured = getConfiguredLevel()
  return levels[level] >= levels[configured] && configured !== 'silent'
}

function write(level, message, fields = {}) {
  if (!shouldLog(level)) {
    return
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'campus-trade-backend',
    message,
    ...fields
  }
  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)
    return
  }

  console.log(line)
}

module.exports = {
  debug: (message, fields) => write('debug', message, fields),
  info: (message, fields) => write('info', message, fields),
  warn: (message, fields) => write('warn', message, fields),
  error: (message, fields) => write('error', message, fields)
}
