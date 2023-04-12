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
} from './dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { IORedisKey } from '../redis/redis.module';
import { Redis } from 'ioredis';
import { ServerErrorException } from './exceptions';

const EXPIRESIN: number = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(IORedisKey) private readonly redisClient: Redis,
  ) {}

  async createUser(dto: AuthDto) {
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
      Logger.log(`- ACCOUNT CREATED: ${dto.email}`);
      return {
        access_token: this._signAccessToken(user.id),
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code == 'P2002') {
          throw new ForbiddenException('Credientials taken');
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
        this.redisClient.set(
          `uid:${user.id.toString()}`,
          refresh_token,
          'EX',
          EXPIRESIN,
        ),
        this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            accessToken: access_token,
          },
        }),
      ]);
      Logger.log(`ACCOUNT "${user.id}" SIGNED IN.`);
      Logger.log(`- SET key 'uid:${user.id}' to REDIS`);
      return {
        access_token,
        refresh_token,
      };
    } catch {
      throw new ServerErrorException();
    }
  }

  async refreshToken(dto: RefreshTokenDto) {
    Logger.log(`runn`);

    const existedToken = await this.redisClient.get(`uid:${dto.userId}`);
    if (!existedToken) throw new ServerErrorException();
    const tokenMatches = dto.refreshToken.localeCompare(existedToken);
    if (tokenMatches) throw new ForbiddenException('Credientials incorrect');
    try {
      const [access_token, refresh_token] = await Promise.all([
        this._signAccessToken(dto.userId),
        this._signRefreshToken(dto.userId),
      ]);
      Logger.log(`ACCOUNT "${dto.userId}" SIGNED IN.`);
      await this.redisClient.set(
        `uid:${dto.userId.toString()}`,
        refresh_token,
        'EX',
        EXPIRESIN,
      );
      Logger.log(`- SET key 'uid:${dto.userId}' to REDIS`);
      return {
        access_token,
        refresh_token,
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

  jwtVerify(payload: IsTokenDto): boolean {
    return Boolean(
      this.jwt.verify(payload.token, {
        secret: this.config.get('JWT_SECRET'),
      }),
    );
    // ? true
    // : false;
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
}
