import { Injectable } from '@nestjs/common';
import { AuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  createUser(dto: AuthDto) {
    return 'This action adds a new auth';
  }

  signin(dto: AuthDto) {
    console.log( 'This action adds a new auth')
    return 'This action adds a new auth';
  }
}
