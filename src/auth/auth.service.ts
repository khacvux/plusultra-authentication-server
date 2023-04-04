import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { IsTokenDto, IsUserIdDto, OwnerCheckDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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
        access_token: this.signToken(user.id, user.email),
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

    Logger.log(`ACCOUNT ""${dto.email}"" SIGNED IN.`);
    return {
      access_token: await this.signToken(user.id, user.email),
    };
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

  async signToken(userId: number, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
      secret,
    });
    return token;
  }

  jwtVerify(payload: IsTokenDto): boolean {
    return this.jwt.verify(payload.token, {
      secret: this.config.get('JWT_SECRET'),
    })
      ? true
      : false;
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
