import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { GetUser } from './decorator';
import { AuthDto } from './dto/auth.dto';
import { IsTokenDto } from './dto/is-token.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @EventPattern('create_user')
  createUser(dto: AuthDto) {
    return this.authService.createUser(dto);
  }

  @MessagePattern('signin')
  signin(@Payload() dto: AuthDto, @GetUser() email: AuthDto) {
    return this.authService.signin(dto);
  }

  @MessagePattern('jwt_passport')
  jwtPassport(@Payload() dto: IsTokenDto) {
    return this.authService.jwtVerify(dto);
  }
}
