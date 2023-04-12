import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { redisModule } from 'src/redis/redis.module.config';

@Module({
  imports: [JwtModule.register({}), redisModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
