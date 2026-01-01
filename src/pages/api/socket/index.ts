/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Server as IOServer } from 'socket.io';
import { firebaseAdmin } from '@lib/firebase/app-admn';
import onConnection from './_connections';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse & { socket: { server: any } }
): Promise<void> {
  // Avoid initializing socket server multiple times
  if (res?.socket?.server?.io) {
    res.status(200).send('Socket already initialized');
    return;
  }

  // Require an auth token; respond 401 if missing/invalid
  const token = req.cookies?.token as string | undefined;
  if (!token) {
    res.status(401).send('Unauthorized');
    return;
  }

  let user: any = null;
  try {
    user = await firebaseAdmin.auth().verifyIdToken(token);
  } catch (err) {
    console.error('Failed to verify token for socket connection:', err);
    res.status(401).send('Invalid token');
    return;
  }

  const io = new IOServer(res.socket.server, {
    cors: {
      origin: '*'
    },
    path: '/api/socket'
  });

  io.on('connection', (socket) => onConnection(io, socket as any, user));

  res.socket.server.io = io;
  res.status(200).send('Socket initialized');
}
