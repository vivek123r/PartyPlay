import { RentoRules, isValidRentoState } from './rules';
import {
  RENTO_REPLAY_VERSION,
  RENTO_SCHEMA_VERSION,
  type RentoMatchState,
  type RentoReplayEnvelope,
  type RentoSaveEnvelope,
} from './types';

const clone = <T>(value: T): T => structuredClone(value);

export const createSaveEnvelope = (
  state: RentoMatchState,
  savedAt = Date.now(),
): RentoSaveEnvelope => ({
  schemaVersion: RENTO_SCHEMA_VERSION,
  savedAt,
  state: clone(state),
});

export const parseSaveEnvelope = (input: string | unknown): RentoSaveEnvelope | null => {
  try {
    const value = typeof input === 'string' ? JSON.parse(input) : input;
    if (!value || typeof value !== 'object') return null;
    const envelope = value as Partial<RentoSaveEnvelope>;
    if (
      envelope.schemaVersion !== RENTO_SCHEMA_VERSION ||
      typeof envelope.savedAt !== 'number' ||
      !isValidRentoState(envelope.state)
    ) {
      return null;
    }
    return clone(envelope as RentoSaveEnvelope);
  } catch {
    return null;
  }
};

export const createReplayEnvelope = (state: RentoMatchState): RentoReplayEnvelope => ({
  replayVersion: RENTO_REPLAY_VERSION,
  options: clone(state.initialOptions),
  commands: clone(state.commandLog),
});

export const replayRentoCommands = (
  input: RentoReplayEnvelope | string,
): RentoRules => {
  const envelope = typeof input === 'string'
    ? JSON.parse(input) as RentoReplayEnvelope
    : clone(input);
  if (
    envelope.replayVersion !== RENTO_REPLAY_VERSION ||
    !envelope.options ||
    !Array.isArray(envelope.commands)
  ) {
    throw new Error('Unsupported or malformed Rento replay.');
  }
  const rules = RentoRules.create(envelope.options);
  for (const [index, record] of envelope.commands.entries()) {
    if (record.sequence !== index + 1 || !record.intent) {
      throw new Error(`Invalid Rento replay command at index ${index}.`);
    }
    rules.dispatch(record.intent);
  }
  return rules;
};

export const restoreRentoRules = (input: RentoSaveEnvelope | string): RentoRules => {
  const envelope = parseSaveEnvelope(input);
  if (!envelope) throw new Error('The Rento save is corrupt or incompatible.');
  return new RentoRules(envelope.state);
};
