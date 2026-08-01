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

/** A compact, serializable private panel sent by the host to one phone companion.
 * It deliberately contains no game commands: the host continues to validate all input. */
export interface RemoteCompanionMetric {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
}

export interface RemoteCompanionView {
  title: string;
  subtitle?: string;
  metrics?: RemoteCompanionMetric[];
  details?: string[];
}

export interface RemoteCompanionPacket {
  version: 1;
  kind: 'companion';
  view: RemoteCompanionView | null;
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
