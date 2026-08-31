import { mcpJsonRpcHandler } from '../../lib/tools.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  return mcpJsonRpcHandler(event)
}
