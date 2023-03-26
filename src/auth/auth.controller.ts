import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { GetUser } from './decorator';
import { AuthDto } from './dto/create-auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @EventPattern('create_user')
  createUser(dto: AuthDto) {
    console.log('called');
    return this.authService.createUser(dto);
  }

  @MessagePattern('signin')
  signin(@Payload() dto: any, @GetUser() email: AuthDto) {
    return this.authService.signin(dto);
  }
}
