// api/chat.js

import fetch from 'node-fetch';

const encoder = new TextEncoder();

const AUTHORIZATION_KEY = "Bearer 你自定义的密钥";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authorizationHeader = req.headers.get("Authorization");
  if (authorizationHeader !== AUTHORIZATION_KEY) {
    return res.status(401).json({ error: "未授权的请求" });
  }

  const requestBody = req.body;
  const isStream = requestBody.stream;
  const model = requestBody.model;

  const newUrl = 'https://api.omidaziz.com/groq/v1/chat';

  try {
    const response = await fetch(newUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization')
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    const data = JSON.parse(responseText);
    let contentBuffer = "";

    if (isStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // 模拟等待期间发送空流响应
      const emptyChunk = {
        id: "chatcmpl-" + Math.random().toString(36).slice(2),
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: null
        }]
      };
      res.write(`data: ${JSON.stringify(emptyChunk)}\n\n`);

      // 模拟实际处理时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (data.content) {
        contentBuffer = data.content;
      }

      const formattedData = {
        id: "chatcmpl-" + Math.random().toString(36).slice(2),
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: {
            content: contentBuffer
          },
          finish_reason: "stop"
        }]
      };
      res.write(`data: ${JSON.stringify(formattedData)}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      if (data.content) {
        contentBuffer = data.content;
      }

      const formattedData = {
        id: "chatcmpl-" + Math.random().toString(36).slice(2),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: contentBuffer
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: JSON.stringify(requestBody).length,
          completion_tokens: contentBuffer.length,
          total_tokens: JSON.stringify(requestBody).length + contentBuffer.length
        }
      };
      res.status(200).json(formattedData);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
