export class ProvablyFairService {
  async generateServerSeed(): Promise<{ seed: string; hash: string }> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const seed = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    const hash = await this.sha256(seed);
    return { seed, hash };
  }

  async deriveCrashMultiplier(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
    const message = `${clientSeed}:${nonce}`;
    const hmac = await this.hmacSha256(serverSeed, message);

    const hex = hmac.slice(0, 13);
    const num = parseInt(hex, 16);
    const maxInt = 2 ** 52;

    const houseEdge = 0.04;
    const crashPoint = Math.floor((1 / (1 - (num / maxInt))) * (1 - houseEdge) * 100) / 100;

    return Math.max(1.0, Math.min(1000, crashPoint));
  }

  async verifyRound(serverSeed: string, serverSeedHash: string, clientSeed: string, nonce: number): Promise<{
    isValid: boolean;
    crashMultiplier: number;
    computedHash: string;
  }> {
    const computedHash = await this.sha256(serverSeed);
    const isValid = computedHash === serverSeedHash;
    const crashMultiplier = await this.deriveCrashMultiplier(serverSeed, clientSeed, nonce);
    return { isValid, crashMultiplier, computedHash };
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async hmacSha256(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const msgData = encoder.encode(message);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const provablyFairService = new ProvablyFairService();
