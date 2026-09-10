import * as Crypto from 'expo-crypto';

/**
 * Every primary key is a client-generated UUID v4 so rows created offline on two
 * devices never collide once syncing is added.
 */
export function newId(): string {
  return Crypto.randomUUID();
}
