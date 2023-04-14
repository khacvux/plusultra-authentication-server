import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon from 'argon2';
import {
  AuthDto,
  IsTokenDto,
  IsUserIdDto,
  OwnerCheckDto,
  RefreshTokenDto,
  SignOutDto,
} from './dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { IORedisKey } from '../redis/redis.module';
import { Redis } from 'ioredis';
import { ServerErrorException } from './exceptions';

const EXPIRESIN: number = 7 * 24 * 60 * 60;
export interface IAuthResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(IORedisKey) private readonly redisClient: Redis,
  ) {}

  async createUser(dto: AuthDto): Promise<IAuthResponse> {
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto?.firstname,
          lastName: dto?.lastname,
          hash,
        },
      });
      const [access_token, refresh_token] = await Promise.all([
        this._signAccessToken(user.id),
        this._signRefreshToken(user.id),
      ]);
      await Promise.all([
        this._setAccessTokenToRedis(user.id.toString(), access_token),
        this._setRefreshTokenToRedis(user.id.toString(), refresh_token),
      ]);
      Logger.log(`- ACCOUNT CREATED: ${dto.email}`);
      return {
        access_token,
        refresh_token,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code == 'P2002') {
          throw new ForbiddenException('existed email');
        }
      }
      throw error;
    }
  }

  async signin(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new ForbiddenException('Credientials incorrect');
    const pwMatches = argon.verify(user.hash, dto.password);
    if (!pwMatches) throw new ForbiddenException('Credientials incorrect');

    const [access_token, refresh_token] = await Promise.all([
      this._signAccessToken(user.id),
      this._signRefreshToken(user.id),
    ]);
    try {
      await Promise.all([
        this._setAccessTokenToRedis(user.id.toString(), access_token),
        this._setRefreshTokenToRedis(user.id.toString(), refresh_token),
      ]);
      Logger.log(`ACCOUNT "${user.id}" SIGNED IN.`);
      return {
        access_token,
        refresh_token,
      };
    } catch {
      throw new ServerErrorException();
    }
  }

  async refresh(dto: RefreshTokenDto) {
    const existedToken = await this._getRefreshTokenFromRedis(
      dto.userId.toString(),
    );
    if (!existedToken) throw new ServerErrorException();
    const tokenMatches = dto.refreshToken.localeCompare(existedToken);
    if (tokenMatches) throw new ForbiddenException('Credientials incorrect');
    try {
      const [access_token, refresh_token] = await Promise.all([
        this._signAccessToken(dto.userId),
        this._signRefreshToken(dto.userId),
      ]);
      Logger.log(`ACCOUNT "${dto.userId}" SIGNED IN.`);
      await Promise.all([
        this._setAccessTokenToRedis(dto.userId.toString(), access_token),
        this._setRefreshTokenToRedis(dto.userId.toString(), refresh_token),
      ]);
      return {
        access_token,
        refresh_token,
      };
    } catch {
      throw new ServerErrorException();
    }
  }

  async signout(dto: SignOutDto) {
    try {
      await Promise.all([
        this._delAccessToken(dto.userId.toString()),
        this._delRefreshToken(dto.userId.toString()),
      ]);
      return {
        message: 'OK',
      };
    } catch {
      throw new ServerErrorException();
    }
  }

  async getUserById(payload: IsUserIdDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
    });
    delete user.hash;
    return user;
  }

  async jwtVerify(payload: IsTokenDto): Promise<boolean> {
    const existedToken = await this.redisClient.get(
      `uida:${this.jwt.decode(payload.token).sub}`,
    );
    if (payload.token == existedToken)
      return Boolean(
        await this.jwt.verify(payload.token, {
          secret: this.config.get('JWT_SECRET'),
        }),
      );
    else return false;
  }

  async OwnerCheck(payload: OwnerCheckDto): Promise<boolean> {
    const result = await this.prisma.post.findUnique({
      where: {
        id: payload.postId,
      },
      select: {
        authorId: true,
      },
    });
    return result.authorId == payload.authorId;
  }

  async _signAccessToken(userId: number): Promise<string> {
    const payload = {
      sub: userId,
    };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('EXPIRESIN'),
      secret: this.config.get('JWT_SECRET'),
    });
    return token;
  }

  async _signRefreshToken(userId: number): Promise<string> {
    const payload = {
      sub: userId,
    };
    const refresh_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('EXPIRESIN_REFRESH'),
      secret: this.config.get('JWT_SECRET_REFRESH'),
    });
    return refresh_token;
  }

  async _setRefreshTokenToRedis(userId: string, refresh_token: string) {
    Logger.log(`- SET key 'uidr:${userId}' to REDIS`);
    return await this.redisClient.set(
      `uidr:${userId}`,
      refresh_token,
      'EX',
      EXPIRESIN,
    );
  }

  async _setAccessTokenToRedis(userId: string, access_token: string) {
    Logger.log(`- SET key 'uida:${userId}' to REDIS`);
    return await this.redisClient.set(
      `uida:${userId}`,
      access_token,
      'EX',
      EXPIRESIN,
    );
  }

  async _getRefreshTokenFromRedis(userId: string) {
    Logger.log(`- GET key 'uidr:${userId}' from REDIS`);
    return this.redisClient.get(`uidr:${userId}`);
  }

  async _getAccessTokenFromRedis(userId: string) {
    Logger.log(`- GET key 'uida:${userId}' from REDIS`);
    return this.redisClient.get(`uida:${userId}`);
  }

  async _delRefreshToken(userId: string) {
    Logger.log(`- DELETE key 'uidr:${userId}' from to REDIS`);
    return this.redisClient.del(`uidr:${userId}`);
  }

  async _delAccessToken(userId: string) {
    Logger.log(`- DELETE key 'uida:${userId}' from to REDIS`);
    return this.redisClient.del(`uida:${userId}`);
  }
}
