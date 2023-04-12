import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager'

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get(key: string) {
    Logger.log(`GET ${key} from REDIS`);
    return await this.cache.get(key);
  }

  async set(key: string, value: unknown) {
    await this.cache.set(key, value);
    Logger.log(`SET ${key} to REDIS`);
    return;
  }

  async del(key: string) {
    Logger.log(`DELETE ${key} from REDIS`);
    return await this.cache.del(key);
  }

  async reset() {
    Logger.log(`RESET REDIS STORE`);
    return await this.cache.reset();
  }
}
