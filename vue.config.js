const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production' ? '/MDNotes/' : '/',
  devServer: {
    host: '127.0.0.1',
    port: 8080,
    allowedHosts: 'all',
    client: {
      webSocketURL: 'ws://127.0.0.1:8080/ws'
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
})
