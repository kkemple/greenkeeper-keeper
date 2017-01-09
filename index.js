const hapi = require('hapi')
const good = require('good')

const keeper = require('hapi-greenkeeper-keeper')

const goodOptions = {
  ops: {
    interval: 1000 * 60
  },
  reporters: {
    console: [{
      module: 'good-console',
      args: [{ log: '*', response: '*', ops: '*' }]
    }, 'stdout']
  }
}

const server = new hapi.Server()

server.connection({ port: process.env.PORT || 8080 })

server.register([
  {
    register: good,
    options: goodOptions
  },
  {
    register: keeper,
    options: {
        github: {
            token: process.env.GITHUB_TOKEN
        },
        squash: process.env.SQUASH_MERGES || false,
        deleteBranches: process.env.DELETE_BRANCHES || true
    }
  }
], (error) => {
  if (error) {
    return console.error(error)
  }

  server.start((error) => {
    if (error) {
      return server.log(['app', 'start', 'error'], error)
    }
    server.log(['app', 'start'], `Server started at ${server.info.uri}`)
  })
})
