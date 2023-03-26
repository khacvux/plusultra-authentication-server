import { ForbiddenException, Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto/create-auth.dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class AuthService{
  constructor(
    @Inject('GATEWAY') private gateway: ClientProxy,
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  createUser(dto: AuthDto) {
    return 'This action adds a new auth';
  }

  async signin(dto: AuthDto) {
    const hash = await argon.hash(dto.password);
    // this.gateway.emit('auth_error', 'error')
    return 'asdasdasasd returned'
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });
      return this.gateway.emit(
        'signed_in',
        this.signToken(user.id, user.email),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code == 'P2002') {
          console.log(new ForbiddenException('Credientials taken'))
          // throw this.gateway.emit(
          //   'auth_exception',
          //   new ForbiddenException('Credientials taken'),
          // );
        }
      }
      throw error
    }
  }

  async signToken(
    userId: number,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
      secret,
    });
    console.log(token)
    return {
      access_token: token,
    };
  }
}
