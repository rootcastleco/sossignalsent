import http from 'http';
import net from 'net';
import crypto from 'crypto';

const TARGET_HOST = process.env.TARGET_HOST ?? '179.60.177.14';
const TARGET_PORT = Number(process.env.TARGET_PORT ?? '6002');
const RELAY_PORT = Number(process.env.RELAY_PORT ?? '6003');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('TCP relay is running. Connect via WebSocket.');
});

server.on('upgrade', (req, socket) => {
  if (req.headers['upgrade']?.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '',
    ''
  ];

  socket.write(responseHeaders.join('\r\n'));

  const context = {
    buffer: Buffer.alloc(0)
  };

  let relayClosed = false;

  const sendFrame = (data, opcode = 0x1) => {
    if (socket.destroyed || relayClosed) return;

    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const length = payload.length;

    let headerLength = 2;
    if (length >= 126 && length <= 0xffff) {
      headerLength += 2;
    } else if (length > 0xffff) {
      headerLength += 8;
    }

    const frame = Buffer.alloc(headerLength + length);
    frame[0] = 0x80 | (opcode & 0x0f);

    if (length < 126) {
      frame[1] = length;
      payload.copy(frame, 2);
    } else if (length <= 0xffff) {
      frame[1] = 126;
      frame.writeUInt16BE(length, 2);
      payload.copy(frame, 4);
    } else {
      frame[1] = 127;
      frame.writeBigUInt64BE(BigInt(length), 2);
      payload.copy(frame, 10);
    }

    socket.write(frame);
  };

  const sendStatus = (status, message) => {
    const payload = { type: 'status', status, message };
    sendFrame(JSON.stringify(payload));
  };

  const upstream = net.createConnection({ host: TARGET_HOST, port: TARGET_PORT }, () => {
    sendStatus('connected');
  });

  sendStatus('connecting');

  const closeRelay = () => {
    if (relayClosed) return;

    if (!socket.destroyed) {
      try {
        sendStatus('disconnected');
        const closeFrame = Buffer.from([0x88, 0x00]);
        socket.write(closeFrame);
      } catch (error) {
        console.error('Failed to send close frame', error);
      }
    }

    relayClosed = true;

    try {
      upstream.destroy();
    } catch (error) {
      console.error('Failed to destroy upstream socket', error);
    }

    if (!socket.destroyed) {
      socket.end();
    }
  };

  upstream.on('data', (chunk) => {
    if (!chunk.length) return;
    sendFrame(JSON.stringify({ type: 'downstream', data: chunk.toString('utf8') }));
  });

  upstream.on('error', (error) => {
    console.error('Upstream error:', error.message);
    sendStatus('error', error.message);
    closeRelay();
  });

  upstream.on('close', () => {
    closeRelay();
  });

  socket.on('data', (data) => {
    context.buffer = Buffer.concat([context.buffer, data]);

    while (true) {
      const frame = extractFrame(context);
      if (!frame) {
        break;
      }

      const { opcode, payload } = frame;

      if (opcode === 0x8) {
        // Close frame
        closeRelay();
        return;
      }

      if (opcode === 0x9) {
        // Ping
        sendFrame(payload, 0xA);
        continue;
      }

      if (opcode === 0x1 || opcode === 0x2) {
        if (!upstream.destroyed) {
          upstream.write(payload);
        }
      }
    }
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    closeRelay();
  });

  socket.on('end', () => {
    closeRelay();
  });
});

server.on('error', (error) => {
  console.error('Relay server error:', error.message);
});

server.listen(RELAY_PORT, () => {
  console.log(`TCP relay listening on ws://0.0.0.0:${RELAY_PORT}`);
  console.log(`Forwarding to tcp://${TARGET_HOST}:${TARGET_PORT}`);
});

function extractFrame(context) {
  const buffer = context.buffer;

  if (buffer.length < 2) {
    return null;
  }

  const firstByte = buffer[0];
  const secondByte = buffer[1];

  const fin = (firstByte & 0x80) !== 0;
  const opcode = firstByte & 0x0f;

  const isMasked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) {
      return null;
    }
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) {
      return null;
    }
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  let maskKey = null;
  if (isMasked) {
    if (buffer.length < offset + 4) {
      return null;
    }
    maskKey = buffer.slice(offset, offset + 4);
    offset += 4;
  }

  const totalLength = offset + payloadLength;
  if (buffer.length < totalLength) {
    return null;
  }

  let payload = buffer.slice(offset, totalLength);

  if (isMasked && maskKey) {
    const unmasked = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i += 1) {
      unmasked[i] = payload[i] ^ maskKey[i % 4];
    }
    payload = unmasked;
  }

  context.buffer = buffer.slice(totalLength);

  return { fin, opcode, payload };
}
