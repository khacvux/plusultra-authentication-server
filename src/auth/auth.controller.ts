import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { GetUser } from './decorator';
import {
  IsTokenDto,
  IsUserIdDto,
  OwnerCheckDto,
  AuthDto,
  RefreshTokenDto,
  SignOutDto,
} from './dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('create_user')
  createUser(@Payload() dto: AuthDto) {
    return this.authService.createUser(dto);
  }

  @MessagePattern('signin')
  signin(@Payload() dto: AuthDto) {
    return this.authService.signin(dto);
  }

  @MessagePattern('refresh_token')
  refresh(@Payload() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @MessagePattern('sign_out')
  signout(@Payload() dto: SignOutDto) {
    return this.authService.signout(dto);
  }

  @MessagePattern('jwt_passport')
  jwtPassport(@Payload() dto: IsTokenDto) {
    return this.authService.jwtVerify(dto);
  }

  @MessagePattern('owner_check')
  ownerCheck(@Payload() dto: OwnerCheckDto) {
    return this.authService.OwnerCheck(dto);
  }

  @MessagePattern('get_me')
  getMe(@Payload() dto: IsUserIdDto) {
    return this.authService.getUserById(dto);
  }
}
