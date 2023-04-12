import { HttpException, HttpStatus } from '@nestjs/common';

export class ServerErrorException extends HttpException {
  constructor() {
    super('Interal server error.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
