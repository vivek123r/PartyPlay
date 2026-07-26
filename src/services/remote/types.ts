export const REMOTE_PROTOCOL_VERSION = 1;

export type RemoteConnectionStatus =
  | 'idle'
  | 'creating-offer'
  | 'awaiting-answer'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface RemoteControllerProfile {
  playerId: number;
  playerName: string;
  playerColor: string;
  gameId: string;
  gameTitle: string;
  actions: string[];
}

export interface RemoteOfferSignal {
  version: 1;
  kind: 'offer';
  profile: RemoteControllerProfile;
  description: RTCSessionDescriptionInit;
}

export interface RemoteAnswerSignal {
  version: 1;
  kind: 'answer';
  playerId: number;
  description: RTCSessionDescriptionInit;
}

export type RemoteSignal = RemoteOfferSignal | RemoteAnswerSignal;

export interface RemoteInputPacket {
  version: 1;
  sequence: number;
  buttons: string[];
}

export interface RemoteSlotSnapshot {
  playerId: number;
  status: RemoteConnectionStatus;
  profile?: RemoteControllerProfile;
  lastInputAt: number;
  error?: string;
}

export interface RemoteControllerSnapshot {
  revision: number;
  slots: Record<number, RemoteSlotSnapshot>;
}
