import { Module } from '@nestjs/common';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { InviteRepository } from './invite.repository';

@Module({
  imports: [],
  controllers: [InviteController],
  providers: [InviteService, InviteRepository],
  exports: [InviteService],
})
export class InviteModule {}
