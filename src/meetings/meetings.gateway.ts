import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { validate, version } from 'uuid';

enum MeetingAction {
  // подключение к комнате
  JOIN = 'join',
  // выход из комнаты
  LEAVE = 'leave',
  // поделиться комнатами
  SHARE_ROOMS = 'share-rooms',
  // создание нового соединения между клиентами
  ADD_PEER = 'add-peer',
  // удаление соединения между клиентами
  REMOVE_PEER = 'remove-peer',
  // передача стримов с медиа-данными
  RELAY_SDP = 'relay-sdp',
  // передача физических подключений
  RELAY_ICE = 'relay-ice',
  // реакция на подключение
  ICE_CANDIDATE = 'ice-candidate',
  // информация о новой сессии
  SESSION_DESCRIPTION = 'session-description',
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MeetingsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.shareRoomsInfo();
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    this.leaveRoom(client);
  }

  @SubscribeMessage(MeetingAction.JOIN)
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() config: { roomId: string },
  ) {
    const { rooms: joinedRooms } = client;

    if (joinedRooms.has(config.roomId)) {
      console.warn(`Already joined to ${config.roomId}`);
    }

    const clients =
      this.server.sockets.adapter.rooms.get(config.roomId) || new Set();

    clients.forEach((clientId) => {
      this.server.to(clientId).emit(MeetingAction.ADD_PEER, {
        peerId: client.id,
        createOffer: false,
      });

      client.emit(MeetingAction.ADD_PEER, {
        peerId: clientId,
        createOffer: true,
      });
    });

    await client.join(config.roomId);
    this.shareRoomsInfo();
  }

  @SubscribeMessage(MeetingAction.RELAY_SDP)
  relaySDP(
    @MessageBody()
    payload: {
      peerId: string;
      sessionDescription: RTCSessionDescriptionInit;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(payload.peerId).emit(MeetingAction.SESSION_DESCRIPTION, {
      peerId: client.id,
      sessionDescription: payload.sessionDescription,
    });
  }

  @SubscribeMessage(MeetingAction.RELAY_ICE)
  relayICE(
    @MessageBody()
    payload: {
      peerId: string;
      iceCandidate: RTCIceCandidate;
    },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(payload.peerId).emit(MeetingAction.ICE_CANDIDATE, {
      peerId: client.id,
      iceCandidate: payload.iceCandidate,
    });
  }

  @SubscribeMessage(MeetingAction.LEAVE)
  leave(@ConnectedSocket() client: Socket) {
    this.leaveRoom(client);
  }

  private getClientRooms() {
    const { rooms } = this.server.sockets.adapter;

    // TODO добавить валидацию на доступность комнат
    return Array.from(rooms.keys()).filter(
      (roomId) => validate(roomId) && version(roomId) === 4,
    );
  }

  // отправка всем клиентам информации о создании новой комнаты
  private shareRoomsInfo() {
    this.server.emit(MeetingAction.SHARE_ROOMS, {
      rooms: this.getClientRooms(),
    });
  }

  private leaveRoom(client: Socket) {
    const { rooms } = this.server.sockets.adapter;

    Array.from(rooms.keys()).forEach((roomId) => {
      const clients =
        this.server.sockets.adapter.rooms.get(roomId) || new Set();

      clients.forEach((clientId) => {
        this.server.to(clientId).emit(MeetingAction.REMOVE_PEER, {
          peerId: client.id,
        });

        client.emit(MeetingAction.REMOVE_PEER, {
          peerId: clientId,
        });
      });

      void client.leave(roomId);
    });
    this.shareRoomsInfo();
  }
}
