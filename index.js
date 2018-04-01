'use strict'

const fp = require('fastify-plugin')
// External utilities
const forwarded = require('forwarded')
const proxyaddr = require('proxy-addr')
// Internals Utilities
const httpErrors = require('./lib/httpErrors')
const assert = require('./lib/assert')
const vary = require('./lib/vary')

function fastifySensible (fastify, opts, next) {
  fastify.decorate('httpErrors', httpErrors)
  fastify.decorate('assert', assert)
  fastify.decorate('to', to)

  fastify.decorateRequest('forwarded', function () {
    return forwarded(this.raw)
  })

  fastify.decorateRequest('proxyaddr', function (trust) {
    return proxyaddr(this.raw, trust)
  })

  fastify.decorateReply('vary', vary)

  // TODO: benchmark if this closure causes some performance drop
  Object.keys(httpErrors).forEach(httpError => {
    fastify.decorateReply(httpError, function (message) {
      // https://github.com/fastify/fastify/issues/848
      if (httpError === 'notFound') this.code(404)
      this.send(httpErrors[httpError](message))
    })
  })

  function to (promise) {
    return promise.then(data => [null, data], err => [err, undefined])
  }

  next()
}

module.exports = fp(fastifySensible, {
  name: 'fastify-sensible',
  fastify: '1.x'
})